// Acesso à PokeAPI (https://pokeapi.co). Quem guarda o resultado no banco são as features
// (especies e golpes); o proxy de /api/pokeapi também parte daqui.

const POKEAPI_URL = 'https://pokeapi.co/api/v2';

/** GET na PokeAPI; resposta fora de 2xx vira erro */
async function buscarJson(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`PokeAPI respondeu ${resposta.status} para ${url}`);
  return resposta.json();
}

/** Id no fim de uma URL da PokeAPI: ".../pokemon-species/25/" -> 25 */
const extrairId = (url) => Number(url.split('/').filter(Boolean).pop());

module.exports = { POKEAPI_URL, buscarJson, extrairId };
