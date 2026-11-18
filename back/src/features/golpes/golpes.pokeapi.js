// Golpes: busca na PokeAPI e converte para o formato do banco
const { POKEAPI_URL, buscarJson, extrairId } = require('../../compartilhado/pokeapi');

/** Ids de todos os golpes que a espécie aprende (por nível, TM, ovo, tutor...) */
async function buscarMovimentos(especieId) {
  const pokemon = await buscarJson(`${POKEAPI_URL}/pokemon/${especieId}`);
  return pokemon.moves.map((m) => extrairId(m.move.url));
}

/** Dados de um golpe no formato da tabela golpes */
async function buscarGolpe(id) {
  const g = await buscarJson(`${POKEAPI_URL}/move/${id}`);
  return {
    id,
    nome: g.name,
    tipo: g.type.name,
    classe: g.damage_class.name,
    poder: g.power,
    precisao: g.accuracy,
    pp: g.pp ?? 1,
  };
}

module.exports = { buscarMovimentos, buscarGolpe };
