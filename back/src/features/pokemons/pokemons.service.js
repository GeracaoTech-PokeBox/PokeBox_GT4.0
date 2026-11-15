// Pokémon (os cards): mint, coleção, XP pós-batalha, evolução e cuidados (afeto).
// Regras de negócio e transações; o SQL fica no model e o formato do card na view.
const { pool, transacao } = require('../../banco/db');
const carteira = require('../../banco/carteira');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { rngSeguro } = require('../../compartilhado/aleatorio');
const {
  sortearAtributos, aplicarXp, evolucoesDisponiveis, aplicarCuidado, bemEstarAtual,
  sortearBonusEvolucao, coracoes,
} = require('../../jogo/regras');
const { garantirEspecie } = require('../especies');
const model = require('./pokemons.model');
const view = require('./pokemons.view');

/**
 * Cria um card único. A espécie já precisa estar no cache (garantirEspecie).
 * A captura da história manda os atributos e o nível do Pokémon selvagem; os outros sorteiam na hora.
 * @param {import('pg').PoolClient} client  transação aberta por quem chamou
 * @param {{ donoId: number, especieId: number, origem: 'inicial' | 'loja' | 'captura', posicaoTime?: number | null,
 *   atributos?: import('../../jogo/regras').AtributosSorteados, nivel?: number,
 *   rng?: import('../../compartilhado/aleatorio').Rng }} dados
 * @returns {Promise<number>} id do card
 */
async function mintarPokemon(client, {
  donoId, especieId, origem, posicaoTime = null, atributos, nivel = 1, rng = rngSeguro,
}) {
  return model.inserir(client, {
    donoId, especieId, origem, atributos: atributos ?? sortearAtributos(rng), posicaoTime, nivel,
  });
}

/** Um card já no formato do front, ou null */
async function buscarCard(db, pokemonId) {
  const linha = await model.buscarCard(db, pokemonId);
  return linha ? view.card(linha) : null;
}

/** Coleção do usuário: primeiro o time (na ordem), depois o resto do mais novo para o mais antigo */
async function listarColecao(usuarioId) {
  const linhas = await model.listarDoDono(pool, usuarioId);
  return linhas.map(view.card);
}

/**
 * Dá XP a cada Pokémon e sobe os níveis. Devolve quem subiu, para o front avisar
 * ("Pikachu #0042 subiu para o nível 12!" / "pode evoluir!").
 * @param {import('pg').PoolClient} client
 * @param {number} donoId    só dá XP a cards que ainda são dele
 * @param {number[]} pokemonIds
 * @param {number} xpGanho
 */
async function darXp(client, donoId, pokemonIds, xpGanho) {
  if (xpGanho <= 0) return [];
  const pokemons = await model.travarParaXp(client, donoId, pokemonIds);

  const subiram = [];
  for (const pokemon of pokemons) {
    const novo = aplicarXp(pokemon, xpGanho);
    await model.salvarNivel(client, pokemon.id, novo);
    if (novo.niveisGanhos > 0) {
      subiram.push({
        pokemonId: pokemon.id,
        mintNumero: pokemon.mint_numero,
        nome: pokemon.nome,
        nivel: novo.nivel,
        podeEvoluir: evolucoesDisponiveis(pokemon, novo).length > 0,
      });
    }
  }
  return subiram;
}

/**
 * Troca a espécie do card. Mint, shiny, IVs, multiplicadores e nível ficam iguais;
 * os status mudam porque calcularStatus usa a base da nova espécie. Cada status ainda pode
 * ganhar pontos extras sorteados (BONUS_EVOLUCAO), que ficam no card.
 * @param {number} usuarioId
 * @param {number} pokemonId
 * @param {number} especieDestinoId  necessário porque algumas espécies têm várias evoluções (Eevee)
 */
async function evoluir(usuarioId, pokemonId, especieDestinoId, rng = rngSeguro) {
  // Fora da transação: pode precisar ir à PokeAPI
  const destino = await garantirEspecie(especieDestinoId);

  return transacao(async (client) => {
    const pokemon = await model.travarParaEvolucao(client, pokemonId);
    if (!pokemon || pokemon.dono_id !== usuarioId) throw new ErroJogo('Pokémon não encontrado.');

    const evolucao = pokemon.evolucoes.find((e) => e.especieId === destino.id);
    if (!evolucao) throw new ErroJogo('Este Pokémon não evolui para essa espécie.');
    if (!evolucoesDisponiveis(pokemon, pokemon).includes(evolucao)) {
      throw new ErroJogo(`Só é possível evoluir no nível ${evolucao.nivel}.`);
    }

    const bonus = sortearBonusEvolucao(rng);
    await model.evoluir(client, pokemonId, destino.id, bonus);
    // O card e, à parte, o que esta evolução sorteou (o front mostra "+3 PS, +5 Velocidade")
    return { ...(await buscarCard(client, pokemonId)), bonusGanho: bonus };
  });
}

/**
 * Carinho, brincar ou alimentar. Cada tipo tem a própria espera (config.CUIDADOS);
 * a linha do card fica travada para dois cliques não passarem juntos pela espera.
 * @param {number} usuarioId
 * @param {number} pokemonId
 * @param {'carinho' | 'brincar' | 'alimentar'} tipo
 */
async function cuidar(usuarioId, pokemonId, tipo) {
  return transacao(async (client) => {
    const pokemon = await model.travarParaCuidado(client, pokemonId);
    if (!pokemon || pokemon.dono_id !== usuarioId) throw new ErroJogo('Pokémon não encontrado.');

    const ultimoEm = await model.ultimoCuidado(client, pokemonId, tipo);
    const agora = new Date();
    const novo = aplicarCuidado({ afeto: pokemon.afeto, ...bemEstarAtual(pokemon, agora) }, tipo, ultimoEm, agora);

    // Grava humor e energia já com o desgaste até agora e reinicia a contagem
    await model.salvarBemEstar(client, pokemonId, { ...novo, agora });
    await model.inserirCuidado(client, pokemonId, tipo, novo.ganho);

    // Corações completados agora que este card ainda não tinha pago
    const coracoesNovos = coracoes(novo.afeto) - pokemon.coracoes_premiados;
    const pokecoins = Math.max(coracoesNovos, 0) * config.RECOMPENSA_POR_CORACAO;
    if (pokecoins > 0) {
      await model.salvarCoracoesPremiados(client, pokemonId, coracoes(novo.afeto));
      await carteira.creditar(client, { usuarioId, valor: pokecoins, motivo: 'recompensa_afeto' });
    }
    return { pokemon: await buscarCard(client, pokemonId), ganho: novo.ganho, pokecoins };
  });
}

/** Últimos cuidados do card (o "hoje" do cantinho de cuidado) */
async function listarCuidados(usuarioId, pokemonId) {
  return model.listarCuidados(pool, usuarioId, pokemonId);
}

module.exports = {
  mintarPokemon,
  buscarCard,
  listarColecao,
  darXp,
  evoluir,
  cuidar,
  listarCuidados,
};
