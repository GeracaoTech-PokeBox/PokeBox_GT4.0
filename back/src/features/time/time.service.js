// Time de batalha: quais Pokémon lutam e em que ordem.
// Regras de negócio e transações; o SQL fica no model.
const { transacao } = require('../../banco/db');
const { travarUsuario } = require('../../banco/travas');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { temRepetidos } = require('../../compartilhado/validacao');
const { garantirQueSaoDoDono, definirOrdem } = require('../pokemons');
const model = require('./time.model');

/**
 * Define o time de batalha na ordem recebida (o primeiro abre a batalha).
 * @param {number} usuarioId
 * @param {number[]} pokemonIds  exatamente TAMANHO_TIME ids diferentes
 */
async function definirTime(usuarioId, pokemonIds) {
  if (pokemonIds.length !== config.TAMANHO_TIME || temRepetidos(pokemonIds)) {
    throw new ErroJogo(`O time precisa de ${config.TAMANHO_TIME} Pokémon diferentes.`);
  }

  return transacao(async (client) => {
    // Trava o usuário, como a compra (no débito) e o inicial fazem: assim uma compra
    // simultânea não ocupa uma posição do time no meio da troca
    await travarUsuario(client, usuarioId);
    await garantirQueSaoDoDono(client, usuarioId, pokemonIds);
    // Pokémon do time não podem ser trocados, então um anunciado não pode entrar no time
    if (await model.algumAnunciado(client, pokemonIds)) {
      throw new ErroJogo('Algum desses Pokémon está anunciado nas trocas. Cancele o anúncio antes de colocá-lo no time.');
    }

    await definirOrdem(client, usuarioId, 'posicao_time', pokemonIds);
  });
}

module.exports = { definirTime };
