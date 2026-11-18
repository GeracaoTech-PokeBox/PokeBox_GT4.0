// Time de batalha: quais Pokémon lutam e em que ordem.
// Regras de negócio e transações; o SQL fica no model.
const { transacao } = require('../../banco/db');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const model = require('./time.model');

/**
 * Define o time de batalha na ordem recebida (o primeiro abre a batalha).
 * @param {number} usuarioId
 * @param {number[]} pokemonIds  exatamente TAMANHO_TIME ids diferentes
 */
async function definirTime(usuarioId, pokemonIds) {
  if (pokemonIds.length !== config.TAMANHO_TIME || new Set(pokemonIds).size !== pokemonIds.length) {
    throw new ErroJogo(`O time precisa de ${config.TAMANHO_TIME} Pokémon diferentes.`);
  }

  return transacao(async (client) => {
    // Trava o usuário, como a compra (no débito) e o inicial fazem: assim uma compra
    // simultânea não ocupa uma posição do time no meio da troca
    await model.travarUsuario(client, usuarioId);
    const meus = await model.contarPokemonsDoDono(client, pokemonIds, usuarioId);
    if (meus !== pokemonIds.length) throw new ErroJogo('Algum desses Pokémon não é seu.');
    // Pokémon do time não podem ser trocados, então um anunciado não pode entrar no time
    if (await model.algumAnunciado(client, pokemonIds)) {
      throw new ErroJogo('Algum desses Pokémon está anunciado nas trocas. Cancele o anúncio antes de colocá-lo no time.');
    }

    await model.definirPosicoes(client, usuarioId, pokemonIds);
  });
}

module.exports = { definirTime };
