// Pokémon: formato do JSON que vai para o front.
// O card ainda é montado por descreverPokemon, em jogo/regras.js (tem testes próprios em regras.test.js);
// vem para cá quando o regras.js for dividido entre as features.
const { descreverPokemon } = require('../../jogo/regras');

/** Card completo a partir de uma linha com CAMPOS_CARD */
const card = (linha) => descreverPokemon(linha);

module.exports = { card };
