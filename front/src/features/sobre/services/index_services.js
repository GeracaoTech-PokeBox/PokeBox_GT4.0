/* Lê o código-fonte do próprio front como texto (import.meta.glob com ?raw do Vite), para a aba
 * de critérios mostrar onde cada técnica foi usada. Ficam de fora:
 *   - features/sobre: esta aba fala das tags, mas não é um caso delas
 *   - main.jsx: tem a legenda das tags, não um caso
 * Só o Criterios importa este arquivo, e ele é carregado sob demanda (lazy): o texto dos fontes
 * só é baixado quando alguém abre a aba de critérios.
 */
const FONTES = import.meta.glob(
  ['/src/**/*.{js,jsx}', '!/src/features/sobre/**', '!/src/main.jsx'],
  { query: '?raw', import: 'default', eager: true },
);

/** { 'src/App.jsx': '<texto do arquivo>', ... } */
export function lerFontes() {
  return Object.fromEntries(Object.entries(FONTES).map(([caminho, texto]) => [caminho.slice(1), texto]));
}
