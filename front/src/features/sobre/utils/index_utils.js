/** Tira a indentação comum das linhas e as linhas em branco das pontas */
export function desindentar(linhas) {
  let inicio = 0;
  let fim = linhas.length;
  while (inicio < fim && !linhas[inicio].trim()) inicio += 1;
  while (fim > inicio && !linhas[fim - 1].trim()) fim -= 1;
  const recorte = linhas.slice(inicio, fim);
  if (recorte.length === 0) return [];
  const recuo = Math.min(...recorte.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return recorte.map((l) => l.slice(recuo).trimEnd());
}

/**
 * Quanto a linha abre (+) ou fecha (-) de (), [], {} e tags JSX. Ignora o conteúdo de strings
 * simples. É uma aproximação, suficiente para saber onde termina um trecho de código.
 */
export function saldoDeAbertura(linha) {
  const semStrings = linha.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '');
  const abre = (semStrings.match(/[([{]/g) ?? []).length + (semStrings.match(/<[A-Za-z>]/g) ?? []).length;
  const fecha = (semStrings.match(/[)\]}]/g) ?? []).length + (semStrings.match(/<\/[A-Za-z]*>|\/>/g) ?? []).length;
  return abre - fecha;
}
