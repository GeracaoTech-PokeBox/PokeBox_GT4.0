// Loja: Pokémon inicial, compra de Pokémon aleatório por geração e compra de Pokébolas.
// Regras de negócio e transações; o SQL fica no model.
const { pool, transacao } = require('../../banco/db');
const { registrarNoExtrato } = require('../../banco/extrato');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { rngSeguro, inteiroEntre } = require('../../compartilhado/aleatorio');
const { garantirEspecie } = require('../../jogo/especies');
const { mintarPokemon, buscarCard } = require('../../jogo/pokemons');
const model = require('./loja.model');

/** O inicial só pode ser escolhido uma vez, por quem ainda não tem nenhum Pokémon */
async function escolherInicial(usuarioId, especieId) {
  if (!config.INICIAIS.includes(especieId)) throw new ErroJogo('Pokémon inicial inválido.');
  await garantirEspecie(especieId);

  return transacao(async (client) => {
    // Trava o usuário para dois cliques não criarem dois iniciais
    await model.travarUsuario(client, usuarioId);
    if (await model.temAlgumPokemon(client, usuarioId)) throw new ErroJogo('Você já escolheu seu Pokémon inicial.');

    const id = await mintarPokemon(client, {
      donoId: usuarioId, especieId, origem: 'inicial', posicaoTime: 1,
    });
    return buscarCard(client, id);
  });
}

/**
 * Sorteia a espécie na loja da geração. Cada sorteio é aceito com a chance da raridade
 * (PESO_RARIDADE): quase sempre um comum sai de primeira, lendários e míticos
 * costumam ser recusados e sorteados de novo.
 * @param {{ primeira: number, ultima: number }} geracao  intervalo de ids de espécie
 */
async function sortearEspecieDaLoja(geracao, rng) {
  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    const especie = await garantirEspecie(inteiroEntre(rng, geracao.primeira, geracao.ultima));
    if (rng() < config.PESO_RARIDADE[especie.raridade]) return especie;
  }
  throw new Error('A loja não conseguiu sortear um Pokémon.');
}

/**
 * Compra um Pokémon aleatório da geração escolhida. Se ainda houver vaga no time, ele já entra.
 * @param {number} usuarioId
 * @param {number} numeroGeracao  1 a 9
 */
async function comprarPokemonAleatorio(usuarioId, numeroGeracao, rng = rngSeguro) {
  const geracao = config.GERACOES.find((g) => g.numero === numeroGeracao);
  if (!geracao) throw new ErroJogo('Geração inválida.');

  // Confere o saldo antes de gastar tempo com a PokeAPI (o débito de verdade é conferido de novo abaixo)
  const pokecoins = await model.lerPokecoins(pool, usuarioId);
  if (pokecoins === undefined || pokecoins < config.PRECO_POKEMON_LOJA) throw new ErroJogo('Pokécoins insuficientes.');

  // Sorteia e busca a espécie antes da transação (a PokeAPI pode demorar)
  const especie = await sortearEspecieDaLoja(geracao, rng);

  return transacao(async (client) => {
    const saldo = await model.debitarPokecoins(client, usuarioId, config.PRECO_POKEMON_LOJA);
    if (saldo === undefined) throw new ErroJogo('Pokécoins insuficientes.');
    await registrarNoExtrato(client, { usuarioId, valor: -config.PRECO_POKEMON_LOJA, motivo: 'compra_loja' });

    const posicaoTime = await model.primeiraVagaNoTime(client, usuarioId, config.TAMANHO_TIME);
    const id = await mintarPokemon(client, {
      donoId: usuarioId, especieId: especie.id, origem: 'loja', posicaoTime, rng,
    });
    return { pokemon: await buscarCard(client, id), saldo };
  });
}

/**
 * Compra Pokébolas (usadas para capturar Pokémon na história).
 * @param {number} usuarioId
 * @param {number} quantidade  1 a POKEBOLAS_POR_COMPRA_MAXIMO
 */
async function comprarPokebolas(usuarioId, quantidade) {
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > config.POKEBOLAS_POR_COMPRA_MAXIMO) {
    throw new ErroJogo(`Compre de 1 a ${config.POKEBOLAS_POR_COMPRA_MAXIMO} Pokébolas por vez.`);
  }
  const custo = quantidade * config.PRECO_POKEBOLA;

  return transacao(async (client) => {
    // Débito condicional, como na compra de Pokémon: dois cliques não gastam o mesmo saldo
    const usuario = await model.trocarPorPokebolas(client, usuarioId, { custo, quantidade });
    if (!usuario) throw new ErroJogo('Pokécoins insuficientes.');
    await registrarNoExtrato(client, { usuarioId, valor: -custo, motivo: 'compra_pokebola' });
    return { saldo: usuario.pokecoins, pokebolas: usuario.pokebolas };
  });
}

module.exports = {
  escolherInicial,
  sortearEspecieDaLoja,
  comprarPokemonAleatorio,
  comprarPokebolas,
};
