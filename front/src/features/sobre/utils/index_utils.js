/**
 * Recorta de um arquivo-fonte as linhas em volta da primeira que contém `marcador`.
 * Devolve { primeiraLinha, linhas } já sem a indentação comum, ou null se o marcador sumiu do arquivo.
 */
export function recortar(fonte, marcador, { antes = 0, depois = 0 } = {}) {
  const todas = fonte.split(/\r?\n/);
  const indice = todas.findIndex((linha) => linha.includes(marcador));
  if (indice === -1) return null;

  const inicio = Math.max(0, indice - antes);
  const linhas = todas.slice(inicio, indice + depois + 1);
  const recuo = Math.min(...linhas.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return { primeiraLinha: inicio + 1, linhas: linhas.map((l) => l.slice(recuo)) };
}
