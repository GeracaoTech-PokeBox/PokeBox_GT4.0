// Acesso à PokeAPI (https://pokeapi.co). Quem guarda o resultado no banco são as features
// (especies e golpes); o proxy de /api/pokeapi também parte daqui.

const { ErroPokeApi } = require('./erros');

const POKEAPI_URL = 'https://pokeapi.co/api/v2';

/** GET na PokeAPI; sem resposta ou resposta fora de 2xx vira ErroPokeApi (a rota responde 503) */
async function buscarJson(url) {
  let resposta;
  try {
    resposta = await fetch(url);
  } catch (erro) {
    // Sem rede, DNS ou certificado recusado (ex.: SELF_SIGNED_CERT_IN_CHAIN de antivírus/proxy)
    throw new ErroPokeApi(`Sem resposta da PokeAPI para ${url} (${erro.cause?.code ?? erro.message})`, { cause: erro });
  }
  if (!resposta.ok) throw new ErroPokeApi(`PokeAPI respondeu ${resposta.status} para ${url}`);
  return resposta.json();
}

/** Id no fim de uma URL da PokeAPI: ".../pokemon-species/25/" -> 25 */
const extrairId = (url) => Number(url.split('/').filter(Boolean).pop());

module.exports = { POKEAPI_URL, buscarJson, extrairId };
