// Roda o teste de integração. Dois jeitos:
//  - DATABASE_URL_TESTE definida (CI, ou um Postgres seu): usa esse banco direto, sem Docker.
//  - Sem ela: usa o Postgres do docker-compose.yml (sobe se precisar) e cria o banco pokebox_teste.
// O banco precisa terminar em _teste: o teste apaga e recria o schema public inteiro.
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const raiz = path.join(__dirname, '../..'); // onde fica o docker-compose.yml
const BANCO = 'pokebox_teste';

function docker(...args) {
  return execFileSync('docker', args, { cwd: raiz, encoding: 'utf8' }).trim();
}

/** Garante um Postgres do compose com o banco de teste e devolve a URL dele */
function prepararBancoNoDocker() {
  // Procura um Postgres já rodando
  let container = docker('ps', '--filter', 'publish=5432', '--format', '{{.Names}}').split('\n')[0];
  if (!container) {
    console.log('Subindo o Postgres...');
    docker('compose', 'up', '-d', '--wait', 'db');
    container = docker('compose', 'ps', '-q', 'db');
  }
  console.log(`Usando o Postgres do container ${container}`);

  const existe = docker('exec', container, 'psql', '-U', 'pokebox', '-d', 'postgres', '-tAc',
    `SELECT 1 FROM pg_database WHERE datname = '${BANCO}'`) === '1';
  if (!existe) {
    console.log(`Criando o banco ${BANCO}...`);
    docker('exec', container, 'createdb', '-U', 'pokebox', BANCO);
  }
  return `postgres://pokebox:pokebox@localhost:5432/${BANCO}`;
}

let url = process.env.DATABASE_URL_TESTE;
if (url) {
  console.log('Usando o banco de DATABASE_URL_TESTE (sem Docker).');
} else {
  try {
    url = prepararBancoNoDocker();
  } catch (erro) {
    console.error('Não deu para preparar o Postgres pelo Docker. Abra o Docker Desktop, '
      + 'ou defina DATABASE_URL_TESTE apontando para um banco terminado em _teste.');
    console.error(erro.message);
    process.exit(1);
  }
}

const resultado = spawnSync(process.execPath,
  ['--test', 'test/integracao.test.js'],
  { cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL_TESTE: url }, stdio: 'inherit' });
process.exit(resultado.status ?? 1);
