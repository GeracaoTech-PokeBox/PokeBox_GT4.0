// Resumo dos relatórios do ZAP por categoria do OWASP Top 10 (2021). Usado pelo rodar.js no fim do
// scan; também roda sozinho para refazer o resumo de um scan antigo:
//   node resumo.js relatorios/<data-hora> [--top10 A01,A05]
const fs = require('node:fs');
const path = require('node:path');

const CATEGORIAS = {
  A01: 'Quebra de controle de acesso',
  A02: 'Falhas criptográficas',
  A03: 'Injeção',
  A04: 'Design inseguro',
  A05: 'Configuração de segurança incorreta',
  A06: 'Componentes vulneráveis e desatualizados',
  A07: 'Falhas de identificação e autenticação',
  A08: 'Falhas de integridade de software e dados',
  A09: 'Falhas de registro e monitoramento',
  A10: 'Falsificação de requisição do lado do servidor (SSRF)',
};

// CWEs das listas oficiais de cada categoria do Top 10 2021 (só os que o ZAP costuma reportar).
// O relatório JSON do ZAP (-J) não traz a tag OWASP_2021_Axx, então é por aqui que o alerta ganha
// categoria. 693 (falta de cabeçalho de proteção) segue a categoria que o próprio ZAP usa, A05.
const CWE_PARA_CATEGORIA = {
  A01: [22, 200, 201, 264, 284, 285, 352, 359, 425, 497, 538, 548, 552, 601, 639, 668, 862, 863, 922, 1275],
  A02: [310, 319, 326, 327, 328, 330, 523, 757, 916],
  A03: [20, 74, 77, 78, 79, 80, 89, 90, 91, 94, 113, 116, 643, 917],
  A04: [209, 256, 434, 501, 522, 525, 1021],
  A05: [2, 11, 16, 315, 520, 526, 537, 541, 547, 611, 614, 693, 756, 776, 942, 1004, 1032, 1174],
  A06: [937, 1035, 1104],
  A07: [287, 290, 295, 306, 307, 384, 521, 613, 640, 798],
  A08: [345, 494, 502, 829, 830, 915],
  A09: [117, 223, 532, 778],
  A10: [918],
};

const RISCOS = { 3: 'Alto', 2: 'Médio', 1: 'Baixo', 0: 'Informativo' };
const RELATORIOS = { 'front.json': 'front', 'api.json': 'API' };

function categoriaDo(alerta) {
  const tag = Object.keys(alerta.tags ?? {}).find((t) => t.startsWith('OWASP_2021_'));
  if (tag) return tag.slice('OWASP_2021_'.length);
  const cwe = Number(alerta.cweid);
  return Object.keys(CWE_PARA_CATEGORIA).find((c) => CWE_PARA_CATEGORIA[c].includes(cwe)) ?? 'Outros';
}

// Alertas de todos os relatórios JSON da pasta, já com alvo e categoria
function lerAlertas(pasta) {
  return Object.entries(RELATORIOS).flatMap(([arquivo, alvo]) => {
    const caminho = path.join(pasta, arquivo);
    if (!fs.existsSync(caminho)) return [];
    const relatorio = JSON.parse(fs.readFileSync(caminho, 'utf8'));
    return (relatorio.site ?? []).flatMap((site) => (site.alerts ?? []).map((alerta) => ({
      alvo,
      nome: alerta.name ?? alerta.alert,
      risco: Number(alerta.riskcode),
      cwe: alerta.cweid,
      ocorrencias: Number(alerta.count ?? alerta.instances?.length ?? 1),
      exemplo: alerta.instances?.[0]?.uri ?? site['@name'],
      categoria: categoriaDo(alerta),
    })));
  });
}

/**
 * Agrupa os alertas por categoria, grava resumo.md na pasta e devolve o texto.
 * @param {string} pasta  relatorios/<data-hora>
 * @param {{ top10?: string[] | null }} opcoes  só estas categorias (ex.: ['A01', 'A05'])
 */
function gerarResumo(pasta, { top10 = null } = {}) {
  const alertas = lerAlertas(pasta).filter((a) => !top10 || top10.includes(a.categoria));
  const linhas = ['# Resumo do scan de segurança (OWASP ZAP)', ''];
  if (top10) linhas.push(`Filtrado nas categorias: ${top10.join(', ')}`, '');

  // Do mais grave para o menos grave (as chaves numéricas vêm em ordem crescente)
  const porRisco = Object.entries(RISCOS).reverse()
    .map(([codigo, nome]) => `${nome}: ${alertas.filter((a) => a.risco === Number(codigo)).length}`);
  linhas.push(`Alertas: ${alertas.length} (${porRisco.join(' · ')})`, '');

  if (alertas.length === 0) {
    linhas.push('Nenhum alerta. Confira se os relatórios front.json/api.json existem nesta pasta.');
  }

  const categorias = [...Object.keys(CATEGORIAS), 'Outros'];
  categorias.forEach((codigo) => {
    const daCategoria = alertas.filter((a) => a.categoria === codigo).sort((a, b) => b.risco - a.risco);
    if (daCategoria.length === 0) return;
    linhas.push(`## ${codigo}${CATEGORIAS[codigo] ? ` – ${CATEGORIAS[codigo]}` : ' (sem categoria do Top 10)'}`, '');
    daCategoria.forEach((a) => {
      linhas.push(`- **[${RISCOS[a.risco]}]** ${a.nome} (${a.alvo}, CWE-${a.cwe}): ${a.ocorrencias} ocorrência(s). Ex.: ${a.exemplo}`);
    });
    linhas.push('');
  });

  const sem = Object.keys(CATEGORIAS).filter((c) => !alertas.some((a) => a.categoria === c) && (!top10 || top10.includes(c)));
  if (sem.length > 0) {
    linhas.push('## Categorias sem alertas neste scan', '');
    linhas.push(sem.map((c) => `${c} – ${CATEGORIAS[c]}`).join('  \n'), '');
    linhas.push('Sem alerta não quer dizer "sem falha": o ZAP não enxerga regras do jogo (ex.: travas que só existem no front).', '');
  }

  const texto = linhas.join('\n');
  fs.writeFileSync(path.join(pasta, 'resumo.md'), texto);
  return { texto, alertas };
}

module.exports = { gerarResumo, categoriaDo };

if (require.main === module) {
  const [pasta] = process.argv.slice(2);
  if (!pasta) {
    console.error('Uso: node resumo.js relatorios/<data-hora> [--top10 A01,A05]');
    process.exit(1);
  }
  const i = process.argv.indexOf('--top10');
  const top10 = i === -1 ? null : process.argv[i + 1].toUpperCase().split(',');
  console.log(gerarResumo(path.resolve(pasta), { top10 }).texto);
}
