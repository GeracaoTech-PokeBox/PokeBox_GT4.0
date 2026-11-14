// PokeAPI de mentira: troca o fetch global só para pokeapi.co, o resto (ex.: o próprio
// teste chamando o servidor local) continua indo para a rede de verdade.
const FETCH_REAL = globalThis.fetch;

/**
 * @param {import('node:test').TestContext} t  o mock é desfeito sozinho no fim do teste
 * @param {Record<string, object | Error | ((url: URL) => Response)>} respostas
 *   caminho depois de /api/v2, sem barra final (ex.: '/pokemon/4') -> JSON, erro de rede ou Response.
 *   Caminho que não estiver aqui responde 404, como a PokeAPI.
 * @returns {{ chamadas: URL[] }}
 */
function instalarPokeApiFake(t, respostas = {}) {
  const chamadas = [];
  t.mock.method(globalThis, 'fetch', async (entrada, opcoes) => {
    const url = new URL(entrada instanceof Request ? entrada.url : String(entrada));
    if (url.hostname !== 'pokeapi.co') return FETCH_REAL(entrada, opcoes);

    chamadas.push(url);
    const caminho = url.pathname.replace(/^\/api\/v2/, '').replace(/\/$/, '');
    const resposta = respostas[caminho];
    if (resposta instanceof Error) throw resposta;
    if (resposta === undefined) return new Response('Not Found', { status: 404 });
    if (typeof resposta === 'function') return resposta(url);
    return Response.json(resposta);
  });
  return { chamadas };
}

module.exports = { instalarPokeApiFake };
