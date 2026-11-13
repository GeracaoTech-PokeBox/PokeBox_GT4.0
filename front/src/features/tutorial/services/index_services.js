// Progresso dos tutoriais, salvo por usuário neste navegador (localStorage).
// Sem localStorage (aba anônima, armazenamento bloqueado) nada quebra: só não lembra do progresso.

const chave = (usuarioId) => `pokebox-tutorial:${usuarioId}`;
const chaveCuidados = (usuarioId) => `pokebox-tutorial-cuidados:${usuarioId}`;

/** Passo salvo do tutorial de primeiro acesso: número em texto, 'fim' ou null se nunca começou */
export function lerPasso(usuarioId) {
  try {
    return localStorage.getItem(chave(usuarioId));
  } catch {
    return null;
  }
}

/** Guarda o passo atual, ou null quando o tutorial terminou ou foi pulado */
export function salvarPasso(usuarioId, passo) {
  try {
    localStorage.setItem(chave(usuarioId), passo === null ? 'fim' : String(passo));
  } catch {
    // sem localStorage: o tutorial pode reaparecer no próximo acesso
  }
}

/** Se o treinador já viu (ou pulou) o tutorial de cuidados neste navegador */
export function cuidadosVistos(usuarioId) {
  try {
    return localStorage.getItem(chaveCuidados(usuarioId)) === 'fim';
  } catch {
    // sem localStorage: não abre sozinho, para não aparecer em toda visita
    return true;
  }
}

export function marcarCuidadosVistos(usuarioId) {
  try {
    localStorage.setItem(chaveCuidados(usuarioId), 'fim');
  } catch {
    // sem localStorage: nada a guardar
  }
}
