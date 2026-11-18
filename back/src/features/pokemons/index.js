// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./pokemons.rotas');
const {
  mintarPokemon, buscarCard, darXp, doDono, garantirQueSaoDoDono, definirOrdem,
} = require('./pokemons.service');
// Trechos de SQL do card, para quem precisa montar cards dentro de uma consulta própria
// (anúncios das trocas, times das batalhas). A linha resultante vira card com `card`.
const { CAMPOS_CARD, SELECT_GOLPES } = require('./pokemons.model');
const { card } = require('./pokemons.view');

module.exports = {
  rotas,
  mintarPokemon,
  buscarCard,
  darXp,
  // Posse e ordem dos cards: usadas pelo time, pela vitrine e pelos golpes
  doDono,
  garantirQueSaoDoDono,
  definirOrdem,
  card,
  CAMPOS_CARD,
  SELECT_GOLPES,
};
