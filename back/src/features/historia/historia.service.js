/* História: trilhas de pontos, cada ponto um Pokémon selvagem sorteado quando o treinador o encontra.
 O treinador batalha com o time de 3 contra o selvagem (que joga sozinho logo depois de cada jogada)
 e, se vencer, ganha Pokécoins e XP e pode tentar capturá-lo com Pokébolas.

 A trilha é linear: só existe um encontro aberto por vez, sempre o próximo ponto depois dos vencidos.
 Cada linha de historia_encontros é um Pokémon encontrado; o que vale para a tela é o último de cada ponto.
 Depois de vencido, o ponto tem até Tentativa_captura_maximo tentativas de captura (ou o treinador pode
 ignorar o Pokémon); capturado, fugido ou ignorado, o ponto pode ser refeito (revanche) contra um novo
 Pokémon aleatório, pagando custo_refazer_historia.
 Toda mudança num encontro acontece com a linha travada (SELECT ... FOR UPDATE),
 então dois cliques nunca aplicam a mesma jogada ou captura duas vezes.

 Regras de negócio e transações; o SQL fica no model, a batalha contra o selvagem em historia.batalha,
 as fórmulas em historia.regras e o formato da resposta na view.*/
const { pool, transacao } = require('../../banco/db');
const carteira = require('../../banco/carteira');
const { travarUsuario } = require('../../banco/travas');
const config = require('../../compartilhado/config');
const { ErroJogo, NaoEncontrado } = require('../../compartilhado/erros');
const { rngSeguro } = require('../../compartilhado/aleatorio');
const { sortearAtributos } = require('../../nucleo/regras');
const { garantirTaxaCaptura } = require('../especies');
const { mintarPokemon, buscarCard, darXp } = require('../pokemons');
const { sortearGolpeInicial } = require('../golpes');
const { carregarTime, timeCompleto } = require('../batalhas');
const { sortearEspecieDaLoja } = require('../loja');
const {
  forcaDoPonto, proximoPonto, nivelSelvagem, xpDaHistoria, chanceDeCaptura, resultadoDaCaptura,
} = require('./historia.regras');
const batalha = require('./historia.batalha');
const model = require('./historia.model');
const view = require('./historia.view');

const { TREINADOR } = batalha;
// Os selvagens podem ser de qualquer geração (lendários e míticos com a mesma raridade da loja, podem ser shiny, com IVs e altura/peso aleatórios). A loja só sorteia espécies da geração atual.
const TODAS_AS_ESPECIES = { primeira: 1, ultima: config.GERACOES.at(-1).ultima };

async function buscarEncontro(db, encontroId) {
  return view.encontro(await model.buscarEncontro(db, encontroId));
}

async function travarEncontro(client, usuarioId, encontroId) {
  const encontro = await model.travarEncontro(client, encontroId);
  if (!encontro || encontro.usuario_id !== usuarioId) throw new NaoEncontrado('Encontro não encontrado.');
  return encontro;
}

/** Sorteia os atributos do Pokémon selvagem de um ponto, grava e devolve a linha (travada) */
async function inserirEncontro(client, usuarioId, { trilha, ponto }, especie, revanche, rng) {
  const forca = forcaDoPonto(trilha, ponto);
  const id = await model.inserirEncontro(client, {
    usuarioId,
    trilha,
    ponto,
    especieId: especie.id,
    forca,
    nivel: nivelSelvagem(forca),
    atributos: sortearAtributos(rng),
    revanche,
  });
  return travarEncontro(client, usuarioId, id);
}

// ---------------------------------------------------------------------------
// Trilha
// ---------------------------------------------------------------------------

/** Tudo o que a tela da história precisa: regras, o último encontro de cada ponto e o próximo ponto */
async function obterHistoria(usuarioId) {
  const encontros = await model.listarUltimosPorPonto(pool, usuarioId);
  // Espécies salvas antes da taxa de captura existir: completa uma vez (cada espécie só vai à PokeAPI uma vez)
  for (const linha of encontros) {
    if (linha.taxa_captura == null) linha.taxa_captura = await garantirTaxaCaptura(linha.especie_id);
  }
  const totais = await model.contarTotais(pool, usuarioId);
  return view.historia({ encontros, totais, proximo: proximoPonto(totais.vencidos) });
}

/**
 * Encontra o Pokémon selvagem do próximo ponto. Se ele já foi encontrado (e ainda não
 * foi vencido), devolve o mesmo: perder ou fugir não sorteia outro.
 */
async function explorar(usuarioId, rng = rngSeguro) {
  const aberto = await model.encontroAberto(pool, usuarioId);
  if (aberto) return view.encontro(aberto);
  if (!proximoPonto(await model.contarVencidos(pool, usuarioId))) throw new ErroJogo('Você já completou toda a história!');

  // Fora da transação: pode precisar ir à PokeAPI
  const especie = await sortearEspecieDaLoja(TODAS_AS_ESPECIES, rng);

  return transacao(async (client) => {
    // Trava o treinador e confere de novo: dois cliques não criam dois encontros
    await travarUsuario(client, usuarioId);
    const jaAberto = await model.encontroAberto(client, usuarioId);
    if (jaAberto) return view.encontro(jaAberto);
    const ponto = proximoPonto(await model.contarVencidos(client, usuarioId));
    if (!ponto) throw new ErroJogo('Você já completou toda a história!');
    return view.encontro(await inserirEncontro(client, usuarioId, ponto, especie, false, rng));
  });
}

// ---------------------------------------------------------------------------
// Batalha
// ---------------------------------------------------------------------------

/** Pokécoins para o treinador e XP para todos os Pokémon do time, tendo lutado ou não */
async function premiar(client, usuarioId, estado, { forca, revanche }) {
  const { pokecoins } = config.HISTORIA_RECOMPENSA;
  await carteira.creditar(client, { usuarioId, valor: pokecoins, motivo: 'recompensa_historia' });
  const xp = xpDaHistoria(forca, revanche);
  const ids = estado.lados[TREINADOR].pokemons.map((p) => p.pokemonId);
  const subiram = await darXp(client, usuarioId, ids, xp);
  return { pokecoins, xp, subiram };
}

/**
 * Grava o turno. Vitória: o Pokémon fica vencido (pode ser capturado) e o prêmio é pago na mesma
 * transação (com a linha travada e a batalha sumindo aqui, nunca paga duas vezes).
 * Derrota ou fuga: na primeira vez o mesmo Pokémon continua esperando no ponto;
 * numa revanche ele foge e a próxima revanche sorteia outro.
 */
async function concluirTurno(client, encontro, usuarioId, { estado, log, fim }) {
  const logJson = JSON.stringify(log); // o pg converteria um array JS num array do PostgreSQL
  let recompensa = null;

  if (!fim) {
    await model.salvarBatalha(client, encontro.id, { estado, logJson });
  } else if (fim.vencedor === TREINADOR) {
    recompensa = await premiar(client, usuarioId, estado, encontro);
    await model.registrarVitoria(client, encontro.id, { logJson, recompensa });
  } else {
    await model.registrarDerrota(client, encontro.id, { logJson });
  }

  return {
    encontro: await buscarEncontro(client, encontro.id),
    // O estado final vai na resposta mesmo quando a batalha acabou, para o front mostrar o desfecho
    batalha: {
      estado, log, fim, recompensa,
    },
  };
}

/** Monta a batalha com o time atual congelado; selvagem mais rápido ataca primeiro */
async function comecarBatalha(client, usuarioId, encontro, rng) {
  const time = await carregarTime(client, usuarioId);
  if (!timeCompleto(time)) {
    throw new ErroJogo(`Monte um time com ${config.TAMANHO_TIME} Pokémon antes de batalhar.`);
  }
  const usuario = await model.buscarTreinador(client, usuarioId);
  return concluirTurno(client, encontro, usuarioId, batalha.comecar(usuario, time, encontro, rng));
}

/**
 * Começa a batalha contra o Pokémon do próximo ponto da trilha.
 * Se a batalha (de qualquer encontro) já estava em andamento, só a devolve.
 */
async function iniciarBatalha(usuarioId, encontroId, rng = rngSeguro) {
  return transacao(async (client) => {
    const encontro = await travarEncontro(client, usuarioId, encontroId);
    if (encontro.estado) return view.retomada(encontro);
    if (encontro.revanche || encontro.status !== 'encontrado') {
      throw new ErroJogo('Esse Pokémon já foi vencido. Use "Refazer" para batalhar de novo neste ponto.');
    }
    return comecarBatalha(client, usuarioId, encontro, rng);
  });
}

/** Erro se o último Pokémon do ponto ainda não deixa refazer (ponto não vencido ou captura pendente) */
function conferirSePodeRefazer(ultimo) {
  if (!ultimo || (!ultimo.revanche && ultimo.status === 'encontrado')) {
    throw new ErroJogo('Vença este ponto antes de refazê-lo.');
  }
  if (ultimo.status === 'vencido') {
    const restantes = config.TENTATIVAS_CAPTURA_MAXIMO - ultimo.tentativas_captura;
    throw new ErroJogo(`Tente capturar ou ignore o Pokémon deste ponto antes: ainda restam ${restantes} tentativas.`);
  }
}

/**
 * Revanche num ponto já vencido contra um novo Pokémon aleatório (mesma força do ponto).
 * Só depois que o último Pokémon do ponto foi capturado, fugiu ou foi ignorado. Custa CUSTO_REFAZER_HISTORIA.
 */
async function refazerPonto(usuarioId, trilha, ponto, rng = rngSeguro) {
  const atual = await model.ultimoDoPonto(pool, usuarioId, trilha, ponto);
  if (atual?.estado) return view.retomada(atual);
  conferirSePodeRefazer(atual);

  // Fora da transação: pode precisar ir à PokeAPI
  const especie = await sortearEspecieDaLoja(TODAS_AS_ESPECIES, rng);

  return transacao(async (client) => {
    // Trava o treinador e confere de novo: dois cliques não cobram nem sorteiam duas vezes
    await travarUsuario(client, usuarioId);
    const ultimo = await model.ultimoDoPonto(client, usuarioId, trilha, ponto);
    if (ultimo?.estado) return view.retomada(ultimo);
    conferirSePodeRefazer(ultimo);

    const saldo = await carteira.debitar(client, {
      usuarioId, valor: config.CUSTO_REFAZER_HISTORIA, motivo: 'refazer_historia',
    });
    if (saldo === undefined) {
      throw new ErroJogo(`Refazer um ponto custa ${config.CUSTO_REFAZER_HISTORIA} Pokécoins e você não tem o suficiente.`);
    }

    const encontro = await inserirEncontro(client, usuarioId, { trilha, ponto }, especie, true, rng);
    return comecarBatalha(client, usuarioId, encontro, rng);
  });
}

/**
 * Jogada do treinador: atacar, trocar ou desistir (fugir).
 * @param {number} usuarioId
 * @param {number} encontroId
 * @param {import('../../nucleo/motor').Acao} acao
 */
async function jogar(usuarioId, encontroId, acao, rng = rngSeguro) {
  return transacao(async (client) => {
    const encontro = await travarEncontro(client, usuarioId, encontroId);
    if (!encontro.estado) throw new ErroJogo('Você não está batalhando com esse Pokémon.');
    const log = [...encontro.log];
    const resultado = batalha.jogarTurno(encontro.estado, acao, log, rng);
    return concluirTurno(client, encontro, usuarioId, { ...resultado, log });
  });
}

// ---------------------------------------------------------------------------
// Captura
// ---------------------------------------------------------------------------

/**
 * Gasta uma Pokébola tentando capturar um Pokémon já derrotado (chance pela espécie: chanceDeCaptura).
 * O capturado vira um card com os mesmos IVs, shiny e nível do selvagem.
 * Depois de TENTATIVAS_CAPTURA_MAXIMO erros ele foge, e o ponto fica livre para refazer.
 */
async function capturar(usuarioId, encontroId, rng = rngSeguro) {
  // Fora da transação: espécies antigas podem precisar ir à PokeAPI buscar a taxa de captura
  const especieId = await model.especieDoEncontro(pool, encontroId, usuarioId);
  const taxaCaptura = especieId ? await garantirTaxaCaptura(especieId) : null;
  // Sorteado antes (pode ir à PokeAPI); só é usado se a captura der certo
  const golpes = especieId ? await sortearGolpeInicial(especieId) : [];

  return transacao(async (client) => {
    const encontro = await travarEncontro(client, usuarioId, encontroId);
    if (encontro.status === 'capturado') throw new ErroJogo('Esse Pokémon já foi capturado.');
    if (encontro.status !== 'vencido') throw new ErroJogo('Vença a batalha antes de tentar capturar.');
    if (encontro.estado) throw new ErroJogo('Termine a batalha antes de tentar capturar.');

    const pokebolas = await model.gastarPokebola(client, usuarioId);
    if (pokebolas === undefined) throw new ErroJogo('Você não tem Pokébolas. Compre na loja.');

    const capturou = rng() < chanceDeCaptura(taxaCaptura);
    let pokemon = null;
    if (capturou) {
      const id = await mintarPokemon(client, {
        donoId: usuarioId,
        especieId: encontro.especie_id,
        origem: 'captura',
        atributos: batalha.atributosDe(encontro),
        nivel: encontro.nivel,
        // O encontro travado pode ser de outra espécie só se mudou no meio; aí o card nasce sem golpe
        golpes: encontro.especie_id === especieId ? golpes : [],
      });
      pokemon = await buscarCard(client, id);
    }
    const tentativas = encontro.tentativas_captura + 1;
    const { status, fugiu } = resultadoDaCaptura({ capturou, tentativas, statusAtual: encontro.status });
    await model.salvarTentativaCaptura(client, encontroId, { tentativas, status, pokemonId: pokemon?.id ?? null });
    return {
      capturou, fugiu, pokemon, pokebolas, encontro: await buscarEncontro(client, encontroId),
    };
  });
}

/**
 * Desiste de capturar um Pokémon derrotado: ele vai embora e o ponto fica livre para refazer.
 * Não dá para desfazer.
 */
async function ignorar(usuarioId, encontroId) {
  return transacao(async (client) => {
    const encontro = await travarEncontro(client, usuarioId, encontroId);
    if (encontro.status !== 'vencido' || encontro.estado) throw new ErroJogo('Só dá para ignorar um Pokémon derrotado que ainda pode ser capturado.');
    await model.ignorar(client, encontroId);
    return buscarEncontro(client, encontroId);
  });
}

module.exports = {
  obterHistoria, explorar, iniciarBatalha, refazerPonto, jogar, capturar, ignorar,
};
