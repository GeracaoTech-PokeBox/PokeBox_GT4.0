// Lê o coverage/lcov.info gerado pelo node --test e confere as metas de test/metas-de-cobertura.js.
// Mostra uma tabela no terminal e, no GitHub Actions, também no resumo da execução.
const fs = require('node:fs');
const path = require('node:path');
const metas = require('./metas-de-cobertura');

const RAIZ = path.join(__dirname, '..');
const MEDIDAS = [['linhas', 'LF', 'LH'], ['ramos', 'BRF', 'BRH'], ['funcoes', 'FNF', 'FNH']];

/** { 'src/app.js': { LF, LH, BRF, BRH, FNF, FNH } } */
function lerLcov(arquivoLcov) {
  const porArquivo = {};
  let atual = null;
  for (const linha of fs.readFileSync(arquivoLcov, 'utf8').split(/\r?\n/)) {
    const [chave, valor] = linha.split(':');
    if (chave === 'SF') {
      const nome = path.relative(RAIZ, linha.slice(3)).split(path.sep).join('/');
      atual = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
      porArquivo[nome] = atual;
    } else if (atual && chave in atual) {
      atual[chave] = Number(valor);
    }
  }
  return porArquivo;
}

/** Percentual com 2 casas; sem nada para medir conta como 100% */
const percentual = (total, cobertos) => (total === 0 ? 100 : Math.floor((cobertos / total) * 10000) / 100);

function medir(contagem) {
  return Object.fromEntries(MEDIDAS.map(([medida, total, cobertos]) => [medida, percentual(contagem[total], contagem[cobertos])]));
}

/**
 * @param {string} arquivoLcov
 * @returns {boolean} true se todas as metas foram atingidas
 */
function conferirCobertura(arquivoLcov) {
  const porArquivo = lerLcov(arquivoLcov);
  const soma = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
  for (const contagem of Object.values(porArquivo)) {
    for (const chave of Object.keys(soma)) soma[chave] += contagem[chave];
  }

  const linhas = [];
  const falhas = [];
  const conferir = (nome, valores, meta) => {
    const abaixo = Object.entries(meta).filter(([medida, minimo]) => valores[medida] < minimo);
    for (const [medida, minimo] of abaixo) falhas.push(`${nome}: ${medida} ${valores[medida]}% (meta ${minimo}%)`);
    linhas.push({ nome, ...valores, meta, ok: abaixo.length === 0 });
  };

  for (const nome of Object.keys(porArquivo).sort()) {
    conferir(nome, medir(porArquivo[nome]), { ...metas.porArquivo, ...metas.arquivos[nome] });
  }
  // Arquivo com meta própria que sumiu do relatório (renomeado ou sem nenhum teste carregando ele)
  for (const nome of Object.keys(metas.arquivos)) {
    if (!porArquivo[nome]) falhas.push(`${nome}: não apareceu no relatório de cobertura`);
  }
  conferir('Total do src/', medir(soma), metas.geral);

  imprimir(linhas, falhas);
  return falhas.length === 0;
}

function textoMeta(meta) {
  const nomes = { linhas: 'linhas', ramos: 'ramos', funcoes: 'funções' };
  return Object.entries(meta).map(([medida, minimo]) => `${nomes[medida]} ≥ ${minimo}%`).join(', ');
}

function imprimir(linhas, falhas) {
  const largura = Math.max(...linhas.map((l) => l.nome.length));
  const num = (v) => `${v.toFixed(2)}%`.padStart(8);
  console.log('\nCobertura (unitários + integração)\n');
  console.log(`${'Arquivo'.padEnd(largura)}   Linhas    Ramos  Funções   Meta`);
  for (const l of linhas) {
    console.log(`${l.nome.padEnd(largura)} ${num(l.linhas)} ${num(l.ramos)} ${num(l.funcoes)}   ${l.ok ? 'ok' : 'ABAIXO'}: ${textoMeta(l.meta)}`);
  }
  console.log(falhas.length === 0
    ? '\nTodas as metas de cobertura foram atingidas.'
    : `\nMetas de cobertura não atingidas:\n${falhas.map((f) => `  - ${f}`).join('\n')}\n`
      + 'Escreva testes para o código novo, ou ajuste test/metas-de-cobertura.js se a mudança for intencional.');

  // No GitHub Actions a tabela também aparece no resumo da execução
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [
      '## Cobertura do back',
      '',
      falhas.length === 0 ? 'Todas as metas foram atingidas.' : `**${falhas.length} meta(s) não atingida(s).**`,
      '',
      '| Arquivo | Linhas | Ramos | Funções | Meta |',
      '| --- | ---: | ---: | ---: | --- |',
      ...linhas.map((l) => `| ${l.ok ? '' : '❌ '}\`${l.nome}\` | ${l.linhas}% | ${l.ramos}% | ${l.funcoes}% | ${textoMeta(l.meta)} |`),
      '',
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

module.exports = { conferirCobertura };
