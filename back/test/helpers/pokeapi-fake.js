// PokeAPI de mentira: troca o fetch global só para pokeapi.co, o resto (ex.: o próprio
// teste chamando o servidor local) continua indo para a rede de verdade.
const FETCH_REAL = globalThis.fetch;

/**
 * @param {import('node:test').TestContext | import('node:test').MockTracker} t
 *   contexto do teste (o mock é desfeito sozinho no fim dele) ou o `mock` global do node:test (vale para o arquivo todo)
 * @param {Record<string, object | Error | ((url: URL) => Response)> | ((caminho: string) => object | undefined)} respostas
 *   caminho depois de /api/v2, sem barra final (ex.: '/pokemon/4') -> JSON, erro de rede ou Response;
 *   ou uma função que recebe o caminho e devolve o JSON (ex.: pokeApiSintetica).
 *   Caminho sem resposta responde 404, como a PokeAPI.
 * @returns {{ chamadas: URL[] }}
 */
function instalarPokeApiFake(t, respostas = {}) {
  const chamadas = [];
  const rastreador = t.mock ?? t;
  rastreador.method(globalThis, 'fetch', async (entrada, opcoes) => {
    const url = new URL(entrada instanceof Request ? entrada.url : String(entrada));
    if (url.hostname !== 'pokeapi.co') return FETCH_REAL(entrada, opcoes);

    chamadas.push(url);
    const caminho = url.pathname.replace(/^\/api\/v2/, '').replace(/\/$/, '');
    const resposta = typeof respostas === 'function' ? respostas(caminho) : respostas[caminho];
    if (resposta instanceof Error) throw resposta;
    if (resposta === undefined) return new Response('Not Found', { status: 404 });
    if (typeof resposta === 'function') return resposta(url);
    return Response.json(resposta);
  });
  return { chamadas };
}

module.exports = { instalarPokeApiFake };
