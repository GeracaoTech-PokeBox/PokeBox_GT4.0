import { CRITERIOS } from '../constants/index_constants';
import { desindentar, saldoDeAbertura } from '../utils/index_utils';

/* Extrai do código-fonte os casos de cada critério de avaliação.
 * O projeto marca cada mudança com uma tag no comentário ([KISS], [DRY], [SOLID-S]...) e, quando
 * houve refatoração, guarda o código antigo depois de "Código original:". Daqui sai cada caso com:
 *   - explicacao: o texto do comentário
 *   - antes: o código antigo guardado no comentário (quando existe)
 *   - depois: o código que vem logo abaixo do comentário (quando existe)
 */

const TAGS = CRITERIOS.map(({ id }) => id);

const TAGS_NO_INICIO = /^((?:\[[A-Z]+(?:-[A-Z])?\])+)\s*/;
// Rótulos que o projeto usa antes do código antigo ("Código original:", "Ex. do original em X:")
const CODIGO_ORIGINAL = /Código original\s*:?|Ex\. do original[^:]*:/;
// Comentário que conta que o código saiu deste arquivo
const REMOVIDO = /^(Retirad[oa]|Movid[oa]|Cópia idêntica)/;
// Linha comentada que parece código (para comentários // que guardam o código antigo sem o rótulo)
const PARECE_CODIGO = /^(export |const |let |function |import |return |<|\{|\}|\w+\(.*[;{(,)]$|[a-z]\w*: .*[,{(]$|[\w-]+=[{"'])/;
// Uma expressão continua na próxima linha quando ela começa assim (ex.: .map(...) encadeado)
const CONTINUA = /^(\.|\?|:|&&|\|\||\+)/;
const MAXIMO_LINHAS = 30;

// Comentários de linha inteira: blocos /* */ (também os {/* */} do JSX) e sequências de //
function encontrarComentarios(linhas) {
  const comentarios = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const aparado = linha.trim();
    if (aparado.startsWith('//')) {
      const inicio = i;
      const textos = [];
      while (i < linhas.length && linhas[i].trim().startsWith('//')) {
        textos.push(linhas[i].replace(/^\s*\/\/ ?/, ''));
        i += 1;
      }
      comentarios.push({ tipo: 'linha', inicio, fim: i - 1, textos });
    } else if (/^\{?\/\*/.test(aparado)) {
      const inicio = i;
      const textos = [];
      let fechou = false;
      while (i < linhas.length && !fechou) {
        let texto = linhas[i];
        if (i === inicio) texto = texto.slice(texto.indexOf('/*') + 2);
        else if (/^\s*\*(?!\/)/.test(texto)) texto = texto.replace(/^\s*\* ?/, '');
        if (texto.includes('*/')) {
          texto = texto.slice(0, texto.indexOf('*/'));
          fechou = true;
        }
        textos.push(texto);
        i += 1;
      }
      comentarios.push({ tipo: 'bloco', inicio, fim: i - 1, textos });
    } else {
      i += 1;
    }
  }
  return comentarios;
}

// O código logo abaixo do comentário, até fechar o que abriu. Sem código colado, não há "depois".
function codigoDepois(linhas, fimDoComentario) {
  const inicio = fimDoComentario + 1;
  if (inicio >= linhas.length || !linhas[inicio].trim() || /^\s*(\/\/|\/\*|\{\/\*)/.test(linhas[inicio])) return null;

  const saida = [];
  let saldo = 0;
  for (let j = inicio; j < linhas.length && saida.length < MAXIMO_LINHAS; j += 1) {
    const linha = linhas[j];
    const delta = saldoDeAbertura(linha);
    // Fechou um bloco que começou antes do trecho: o trecho acabou
    if (saldo + delta < 0) break;
    saida.push(linha);
    saldo += delta;
    const proxima = linhas[j + 1]?.trim() ?? '';
    if (saldo <= 0 && !/[=(:?&|+-]$/.test(linha.trim()) && !CONTINUA.test(proxima)) break;
  }
  const cortado = saldo > 0;
  const recorte = desindentar(saida);
  return { primeiraLinha: inicio + 1, linhas: cortado ? [...recorte, '…'] : recorte };
}

// Para comentários de cabeçalho (fora de qualquer função e separados do código por uma linha em
// branco): a declaração principal do arquivo, que é o componente do export default ou o hook exportado
function declaracaoPrincipal(linhas, inicioDoComentario) {
  if (/^\s/.test(linhas[inicioDoComentario])) return null;
  const padrao = linhas.join('\n').match(/^export default (\w+);/m)?.[1];
  const indice = padrao
    ? linhas.findIndex((l) => l.startsWith(`function ${padrao}(`))
    : linhas.findIndex((l) => /^export (async )?function /.test(l));
  return indice > inicioDoComentario ? codigoDepois(linhas, indice - 1) : null;
}

// Junta as linhas da explicação em parágrafos, mantendo itens de lista ("- ...") em linhas próprias
function montarTexto(linhas) {
  const paragrafos = [];
  linhas.forEach((linha) => {
    const aparado = linha.trim();
    if (!aparado) {
      if (paragrafos.at(-1) !== '') paragrafos.push('');
      return;
    }
    const novaLinha = paragrafos.length === 0 || paragrafos.at(-1) === '' || /^[-•]/.test(aparado);
    if (novaLinha) paragrafos.push(aparado);
    else paragrafos[paragrafos.length - 1] += ` ${aparado}`;
  });
  return paragrafos.filter(Boolean).join('\n');
}

// Divide um trecho do comentário em explicação e código antigo
function separarAntes(textos) {
  const indice = textos.findIndex((t) => CODIGO_ORIGINAL.test(t));
  if (indice !== -1) {
    const [explicacao, resto] = textos[indice].split(CODIGO_ORIGINAL);
    const antes = desindentar([resto, ...textos.slice(indice + 1)]);
    return { explicacao: [...textos.slice(0, indice), explicacao], antes: antes.length ? antes : null };
  }
  // Comentário que termina com linhas de código comentadas, sem o rótulo
  // (ex.: "// export function BarraHp(...)" ou um aria-label antigo dentro de {/* */})
  const preenchidos = textos.filter((t) => t.trim());
  let corte = preenchidos.length;
  while (corte > 1 && PARECE_CODIGO.test(preenchidos[corte - 1].trim())) corte -= 1;
  if (corte < preenchidos.length) return { explicacao: preenchidos.slice(0, corte), antes: desindentar(preenchidos.slice(corte)) };
  return { explicacao: textos, antes: null };
}

/** Todos os casos marcados com as tags dos critérios em um arquivo */
export function extrairCasos(arquivo, fonte) {
  const linhas = fonte.split(/\r?\n/);
  const casos = [];

  encontrarComentarios(linhas).forEach(({ inicio, fim, textos }) => {
    // Cada trecho começa numa linha que abre com tags e vai até a próxima linha assim
    const trechos = [];
    textos.forEach((texto, i) => {
      const tags = texto.trim().match(TAGS_NO_INICIO);
      if (tags) {
        trechos.push({
          linha: inicio + i + 1,
          tags: tags[1].match(/[A-Z]+(?:-[A-Z])?/g),
          textos: [texto.trim().replace(TAGS_NO_INICIO, '')],
        });
      } else if (trechos.length) {
        trechos.at(-1).textos.push(texto);
      }
    });

    if (trechos.length === 0) return;
    const logoAbaixo = codigoDepois(linhas, fim);
    const declaracao = logoAbaixo ? null : declaracaoPrincipal(linhas, inicio);
    trechos.forEach(({ linha, tags, textos: textosDoTrecho }) => {
      const doCriterio = tags.filter((tag) => TAGS.includes(tag));
      if (doCriterio.length === 0) return;
      const { explicacao, antes } = separarAntes(textosDoTrecho);
      // Código que saiu do arquivo ("Retirado daqui", "Movida para..."): não há "depois" neste lugar
      const removido = Boolean(antes) && REMOVIDO.test(explicacao.join(' ').trim());
      let depois = null;
      if (logoAbaixo) depois = { ...logoAbaixo, origem: 'logoAbaixo' };
      else if (declaracao && !removido) depois = { ...declaracao, origem: antes ? 'logoAbaixo' : 'declaracao' };
      casos.push({
        id: `${arquivo}:${linha}`,
        tags: doCriterio,
        arquivo,
        linha,
        explicacao: montarTexto(explicacao),
        antes,
        depois,
      });
    });
  });

  return casos;
}

/** Casos de todos os arquivos, agrupados por tag e na ordem dos arquivos */
export function agruparPorTag(fontes) {
  const grupos = Object.fromEntries(TAGS.map((tag) => [tag, []]));
  Object.entries(fontes)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([arquivo, fonte]) => {
      extrairCasos(arquivo, fonte).forEach((caso) => caso.tags.forEach((tag) => grupos[tag].push(caso)));
    });
  return grupos;
}
