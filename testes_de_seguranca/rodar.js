// Testes de segurança do PokeBox com o OWASP ZAP. Uso (nesta pasta):
//   npm run seguranca                       os dois scans e o resumo
//   npm run seguranca -- --so front         só o baseline (passivo) do front
//   npm run seguranca -- --so api           só o scan ativo da API
//   npm run seguranca -- --top10 A01,A05    resumo só dessas categorias do OWASP Top 10
//   npm run seguranca -- --minutos 5        limite do scan ativo (padrão: 15 min)
// Os relatórios ficam em relatorios/<data-hora>/ (HTML do ZAP, JSON e resumo.md por categoria).
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { gerarResumo } = require('./resumo');

const PASTA = __dirname;
const FRONT = 'http://front:5174';

function opcoes(argv) {
  const valor = (nome) => {
    const i = argv.indexOf(`--${nome}`);
    return i === -1 ? null : argv[i + 1];
  };
  const so = valor('so');
  if (so && !['front', 'api'].includes(so)) throw new Error('--so aceita "front" ou "api".');
  return {
    front: so !== 'api',
    api: so !== 'front',
    top10: valor('top10')?.toUpperCase().split(',').map((c) => c.trim()) ?? null,
    minutos: Number(valor('minutos') ?? 15),
  };
}

// docker compose deste projeto isolado (name: pokebox_seguranca no docker-compose.yml)
function compose(args, { saida = 'inherit' } = {}) {
  return execFileSync('docker', ['compose', ...args], { cwd: PASTA, encoding: 'utf8', stdio: ['ignore', saida, 'inherit'] });
}

// Cria o treinador de teste (com inicial, para as rotas de coleção terem dados) e devolve o token.
// Roda dentro do container do back: as portas do ambiente isolado não ficam abertas na máquina.
function criarUsuarioDeTeste() {
  const script = `
    const api = (rota, corpo, token) => fetch('http://localhost:8080/api' + rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(corpo),
    }).then((r) => r.json().catch(() => ({})));
    (async () => {
      const { token } = await api('/auth/cadastro', { login: 'zap-scanner', celular: '11988887777', senha: 'senha-do-zap' });
      if (!token) throw new Error('não foi possível criar o usuário de teste');
      await api('/eu/inicial', { especieId: 1 }, token); // se a PokeAPI falhar, o scan segue sem inicial
      process.stdout.write(token);
    })().catch((e) => { console.error(e.message); process.exit(1); });`;
  return compose(['exec', '-T', 'back', 'node', '-e', script], { saida: 'pipe' }).trim();
}

// Roda um script do ZAP com a pasta do relatório montada em /zap/wrk.
// Código de saída: 0 sem alertas, 2 com avisos, 1 com falhas, 3 erro do ZAP. Só o 3 é problema nosso.
function zap(destino, ambiente, argumentos) {
  const env = Object.entries(ambiente).flatMap(([chave, valor]) => ['-e', `${chave}=${valor}`]);
  const r = spawnSync('docker', [
    'compose', '--profile', 'zap', 'run', '--rm', '--no-deps',
    '-v', `${destino}:/zap/wrk:rw`, ...env, 'zap', ...argumentos,
  ], { cwd: PASTA, stdio: 'inherit' });
  if (r.status === 3 || r.status === null) throw new Error(`O ZAP falhou (código ${r.status}).`);
}

function main() {
  const op = opcoes(process.argv.slice(2));
  const carimbo = new Date().toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-');
  const destino = path.join(PASTA, 'relatorios', carimbo);
  fs.mkdirSync(destino, { recursive: true });
  // O ZAP lê a definição da API de /zap/wrk; a cópia também registra o que foi testado
  fs.copyFileSync(path.join(PASTA, 'zap', 'openapi.yaml'), path.join(destino, 'openapi.yaml'));

  console.log('\n== Subindo o ambiente isolado (banco descartável, back e front) ==');
  compose(['up', '-d', '--build', '--wait', 'db', 'back', 'front']);
  try {
    if (op.front) {
      console.log(`\n== ZAP baseline (passivo) no front: ${FRONT} ==`);
      zap(destino, {}, ['zap-baseline.py', '-t', FRONT, '-J', 'front.json', '-r', 'front.html', '-I']);
    }
    if (op.api) {
      console.log('\n== Criando o usuário de teste ==');
      const token = criarUsuarioDeTeste();
      console.log(`\n== ZAP API scan (ativo, autenticado) no back, até ${op.minutos} min ==`);
      zap(destino, { ZAP_AUTH_HEADER_VALUE: `Bearer ${token}` }, [
        'zap-api-scan.py', '-t', '/zap/wrk/openapi.yaml', '-f', 'openapi',
        '-J', 'api.json', '-r', 'api.html', '-I',
        '-z', `-config scanner.maxScanDurationInMins=${op.minutos}`,
      ]);
    }
  } finally {
    console.log('\n== Desligando o ambiente isolado (o banco de teste é apagado) ==');
    compose(['--profile', 'zap', 'down', '--volumes', '--remove-orphans']);
  }

  const resumo = gerarResumo(destino, { top10: op.top10 });
  console.log(`\n${resumo.texto}`);
  console.log(`Relatórios em: ${destino}`);
}

main();
