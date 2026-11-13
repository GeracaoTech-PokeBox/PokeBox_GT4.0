/* Cliente HTTP do back (/api/...). Era o começo de models/api/index.js: o token, o ErroApi e o
 * chamar(). As chamadas de cada endpoint foram para services/index_services.js da feature dona dele.
 * [SOLID-D] Só os services das features importam este arquivo, pela fachada @/core.
 */

// Chamadas aos endpoints do jogo no back (/api/...)

// Endereço do back. Vazio = mesmo endereço do front (no docker-compose e no `npm run dev`
// o Vite repassa /api para o back). Publicado no Netlify, vem de VITE_BACK_URL (URL do
// Render). A barra final é removida para não virar "...onrender.com//api".
export const BACK_URL = (import.meta.env.VITE_BACK_URL ?? '').trim().replace(/\/+$/, '');
const CHAVE_TOKEN = 'pokebox-token';

// No plano grátis do Render o back dorme depois de 15 min sem acesso e leva cerca de
// 1 min para acordar. Chamado ao abrir o site, para ele ir acordando enquanto a pessoa
// digita o login.
export function acordarServidor() {
  fetch(`${BACK_URL}/api/saude`).catch(() => {});
}

// O token fica no localStorage para o login sobreviver a um F5.
// Em aba anônima ou com armazenamento bloqueado, o login dura só até fechar a aba.
let tokenEmMemoria = null;

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? tokenEmMemoria;
  } catch {
    return tokenEmMemoria;
  }
}

export function salvarToken(token) {
  tokenEmMemoria = token;
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // sem localStorage: fica só em memória
  }
}

export const temSessao = () => Boolean(lerToken());

// Erro com a mensagem que o back mandou ({ erro: "..." }) e o status HTTP
// [SOLID-L] ErroApi estende Error sem mudar o contrato: continua tendo `message` e só acrescenta
// `status`. Os ViewModels tratam qualquer falha com "catch (e) { setErro(e.message) }" e recebem um
// ErroApi no lugar de um Error comum sem precisar saber disso.
export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

export async function chamar(metodo, caminho, corpo) {
  const token = lerToken();
  let resposta;
  try {
    resposta = await fetch(`${BACK_URL}/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Não foi possível falar com o servidor. Verifique sua conexão.', 0);
  }

  const texto = await resposta.text();
  let dados;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    // Ex.: página HTML de 404 quando o back está rodando uma versão antiga, sem esta rota
    throw new ErroApi('O servidor respondeu algo inesperado. Ele pode estar desatualizado; reinicie o back.', resposta.status);
  }
  if (!resposta.ok) {
    if (resposta.status === 401) salvarToken(null);
    throw new ErroApi(dados?.erro ?? 'Algo deu errado. Tente novamente.', resposta.status);
  }
  return dados;
}
