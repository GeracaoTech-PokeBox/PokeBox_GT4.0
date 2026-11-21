// Golpes especiais: cache local dos golpes da PokeAPI e a roleta que dá golpes a um Pokémon com afeto máximo.
// Como a Pokédex (features/especies), cada golpe e cada lista de golpes de uma espécie é buscada uma vez só,
// assim as batalhas não dependem da PokeAPI.
// Regras de negócio e transações; o SQL fica no model e a PokeAPI em golpes.pokeapi.
const { pool, transacao } = require('../../banco/db');
const carteira = require('../../banco/carteira');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { rngSeguro } = require('../../compartilhado/aleatorio');
const { afetoMaximo } = require('../../nucleo/regras');
const { buscarCard, doDono } = require('../pokemons');
const model = require('./golpes.model');
const pokeapi = require('./golpes.pokeapi');

/**
 * Ids de todos os golpes que a espécie aprende, guardados em especies.movimentos.
 * Chame fora de transação: pode ir à PokeAPI.
 */
async function garantirMovimentos(especieId) {
  const salvos = await model.lerMovimentos(pool, especieId);
  if (salvos) return salvos;

  const movimentos = await pokeapi.buscarMovimentos(especieId);
  await model.salvarMovimentos(pool, especieId, movimentos);
  return movimentos;
}

/**
 * Dados de um golpe, guardados na tabela golpes. Golpes sem dano (Light Screen, Growl...) também
 * ficam no cache, com poder null, para não serem buscados de novo.
 * Chame fora de transação: pode ir à PokeAPI.
 */
async function garantirGolpe(id) {
  const salvo = await model.buscarGolpe(pool, id);
  if (salvo) return salvo;

  const golpe = await pokeapi.buscarGolpe(id);
  await model.inserirGolpe(pool, golpe);
  return golpe;
}

/** Golpe que dá para usar em batalha: precisa causar dano */
const causaDano = (golpe) => golpe.classe !== 'status' && golpe.poder !== null && golpe.poder > 0;

/**
 * Sorteia `quantidade` golpes de dano diferentes da lista da espécie, fora os de `excluir`. A lista
 * é embaralhada e os golpes são buscados um por um até achar os de dano, então só os sorteados vão à PokeAPI.
 */
async function sortearGolpes(especieId, quantidade, rng, excluir = []) {
  const lista = [...new Set(await garantirMovimentos(especieId))].filter((id) => !excluir.includes(id));

  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  const escolhidos = [];
  for (const id of lista) {
    if (escolhidos.length === quantidade) break;
    const golpe = await garantirGolpe(id);
    if (causaDano(golpe)) escolhidos.push(golpe.id);
  }
  return escolhidos;
}

/**
 * Golpe com que o Pokémon nasce (GOLPES_INICIAIS). Chame antes da transação que cria o card e
 * passe o resultado no `golpes` do mintarPokemon. Se a PokeAPI falhar, o card nasce sem golpe
 * (a compra ou captura não deve falhar por isso) e o completarGolpesIniciais dá um depois.
 * @returns {Promise<number[]>}
 */
async function sortearGolpeInicial(especieId, rng = rngSeguro) {
  try {
    return await sortearGolpes(especieId, config.GOLPES_INICIAIS, rng);
  } catch (erro) {
    console.warn(`Golpe inicial da espécie ${especieId} não sorteado: ${erro.message}`);
    return [];
  }
}

/**
 * Ao subir o back: dá o golpe inicial aos cards que ainda não têm nenhum (os criados antes desta
 * regra ou quando a PokeAPI falhou) e completa os extras de quem já tinha roletado na regra antiga
 * (2 golpes, sem o inicial). Roda em segundo plano; um card que falhar fica para a próxima vez.
 */
async function completarGolpesIniciais(rng = rngSeguro) {
  const extras = config.GOLPES_EXTRAS;
  const cards = await model.listarComGolpesFaltando(pool, extras);
  let completados = 0;
  for (const card of cards) {
    try {
      const faltam = card.golpes.length === 0 ? config.GOLPES_INICIAIS : config.GOLPES_INICIAIS + extras - card.golpes.length;
      const novos = await sortearGolpes(card.especie_id, faltam, rng, card.golpes);
      if (novos.length > 0 && await model.acrescentarGolpes(pool, card.id, card.golpes, novos)) completados += 1;
    } catch (erro) {
      console.warn(`Golpes do card ${card.id} não completados: ${erro.message}`);
    }
  }
  if (completados > 0) console.log(`Golpes especiais completados em ${completados} Pokémon.`);
}

/** Golpes liberados: pelo afeto máximo ou pelo desbloqueio pago */
const golpesLiberados = (pokemon) => afetoMaximo(pokemon.afeto) || pokemon.golpes_desbloqueados;

/** O card, se for do usuário; senão "não encontrado" */
async function buscarPokemonDoUsuario(db, usuarioId, pokemonId, opcoes) {
  return doDono(await model.buscarPokemon(db, pokemonId, opcoes), usuarioId);
}

/**
 * Sorteia os golpes (fora da transação, pode ir à PokeAPI), cobra e grava. O que muda entre a
 * roleta e o desbloqueio vem em `regras`: o que conferir no card, o custo e o motivo no extrato.
 */
async function sortearECobrar(usuarioId, pokemonId, regras, rng) {
  const antes = await buscarPokemonDoUsuario(pool, usuarioId, pokemonId);
  regras.conferir(antes);
  const custo = regras.custo(antes);
  if (custo > 0 && (await carteira.lerSaldo(pool, usuarioId)) < custo) throw new ErroJogo(regras.semSaldo(custo));

  // O golpe inicial fica; os extras são sorteados (de novo) entre os outros. Sem golpe inicial
  // (a PokeAPI falhou quando ele nasceu), sorteia o inicial junto.
  const iniciais = antes.golpes.slice(0, config.GOLPES_INICIAIS);
  const quantidade = config.GOLPES_INICIAIS - iniciais.length + config.GOLPES_EXTRAS;
  const novos = await sortearGolpes(antes.especie_id, quantidade, rng, iniciais);
  if (novos.length === 0) throw new ErroJogo('Esse Pokémon não aprende outros golpes que causem dano.');
  const golpes = [...iniciais, ...novos];

  return transacao(async (client) => {
    // Confere de novo com o card travado: pode ter evoluído, sido trocado ou roletado em outra aba
    const pokemon = await buscarPokemonDoUsuario(client, usuarioId, pokemonId, { travar: true });
    regras.conferir(pokemon);
    if (pokemon.especie_id !== antes.especie_id || pokemon.golpes.join() !== antes.golpes.join()) {
      throw new ErroJogo('Esse Pokémon mudou enquanto a roleta girava. Tente de novo.');
    }
    if (custo > 0) {
      const saldo = await carteira.debitar(client, { usuarioId, valor: custo, motivo: regras.motivo });
      if (saldo === undefined) throw new ErroJogo(regras.semSaldo(custo));
    }
    await model.salvarGolpes(client, pokemonId, golpes, regras.desbloquear ?? false);
    return { pokemon: await buscarCard(client, pokemonId), custo };
  });
}

/**
 * Roleta de golpes: mantém o golpe inicial e sorteia GOLPES_EXTRAS golpes de dano entre os que a
 * espécie atual aprende. Só com os golpes liberados (afeto máximo ou desbloqueio);
 * a primeira (a que dá os extras) é grátis e as outras custam CUSTO_ROLETA_GOLPES.
 * @param {number} usuarioId
 * @param {number} pokemonId
 */
async function roletarGolpes(usuarioId, pokemonId, rng = rngSeguro) {
  return sortearECobrar(usuarioId, pokemonId, {
    conferir: (pokemon) => {
      if (!golpesLiberados(pokemon)) {
        throw new ErroJogo(
          `Os golpes especiais são liberados com o afeto máximo (5 corações) ou desbloqueando por ${config.CUSTO_DESBLOQUEIO_GOLPES} Pokécoins.`,
        );
      }
    },
    custo: (pokemon) => (pokemon.golpes.length > config.GOLPES_INICIAIS ? config.CUSTO_ROLETA_GOLPES : 0),
    semSaldo: (custo) => `Roletar de novo custa ${custo} Pokécoins.`,
    motivo: 'roleta_golpes',
  }, rng);
}

/**
 * Atalho pago: libera os golpes do card sem o afeto máximo e já faz a primeira roleta.
 * Depois disso o card segue as regras normais (roletar de novo custa CUSTO_ROLETA_GOLPES).
 */
async function desbloquearGolpes(usuarioId, pokemonId, rng = rngSeguro) {
  return sortearECobrar(usuarioId, pokemonId, {
    conferir: (pokemon) => {
      if (golpesLiberados(pokemon)) throw new ErroJogo('Os golpes especiais desse Pokémon já estão liberados.');
    },
    custo: () => config.CUSTO_DESBLOQUEIO_GOLPES,
    semSaldo: (custo) => `Desbloquear os golpes custa ${custo} Pokécoins.`,
    motivo: 'desbloqueio_golpes',
    desbloquear: true,
  }, rng);
}

module.exports = {
  roletarGolpes, desbloquearGolpes, sortearGolpeInicial, completarGolpesIniciais,
};
