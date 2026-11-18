// Mercado de trocas: anúncios (venda por Pokécoins e/ou propostas), compra direta e propostas de troca.
//
// Nada fica reservado enquanto um anúncio ou proposta está aberto: na hora de comprar ou aceitar,
// tudo é travado e conferido de novo (dono, fora do time, saldo). Os usuários são sempre travados
// primeiro e em ordem de id, depois o anúncio, para duas operações cruzadas não se travarem.
//
// Regras de negócio e transações; o SQL fica no model e o formato da resposta na view.
const { pool, transacao } = require('../../banco/db');
const carteira = require('../../banco/carteira');
const { travarUsuarios } = require('../../banco/travas');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { temRepetidos } = require('../../compartilhado/validacao');
const { buscarCard } = require('../pokemons');
const model = require('./trocas.model');
const view = require('./trocas.view');

const { ORDENS_MERCADO, ORDENS_ANUNCIOS } = model;

// ---------------------------------------------------------------------------
// Consultas do mercado
// ---------------------------------------------------------------------------

/**
 * Espécies com anúncios ativos (a primeira tela do mercado)
 * @param {string} busca  parte do nome
 * @param {keyof ORDENS_MERCADO} ordem
 */
async function listarMercado(busca, ordem) {
  return model.listarMercado(pool, busca, ordem);
}

/** Todos os anúncios ativos de uma espécie, cada um com o card e quem anunciou */
async function listarAnunciosDaEspecie(usuarioId, especieId, ordem) {
  const linhas = await model.listarAnunciosDaEspecie(pool, especieId, ordem);
  return linhas.map((linha) => view.anuncio(linha, usuarioId));
}

async function listarMeusAnuncios(usuarioId) {
  const linhas = await model.listarAnunciosAtivosDoVendedor(pool, usuarioId);
  return linhas.map((linha) => view.anuncio(linha, usuarioId));
}

// ---------------------------------------------------------------------------
// Travas e transferências
// ---------------------------------------------------------------------------

async function lerAnuncio(db, anuncioId, opcoes) {
  const anuncio = await model.lerAnuncio(db, anuncioId, opcoes);
  if (!anuncio) throw new ErroJogo('Anúncio não encontrado.');
  return anuncio;
}

async function travarAnuncioAtivo(client, anuncioId) {
  const anuncio = await lerAnuncio(client, anuncioId, { travar: true });
  if (anuncio.status !== 'ativo') throw new ErroJogo('Esse anúncio não está mais disponível.');
  return anuncio;
}

/** Trava os cards e confere que ainda são do dono e estão fora do time de batalha */
async function travarCardsLivres(client, pokemonIds, donoId, mensagem = 'Algum desses Pokémon não está mais disponível.') {
  if (pokemonIds.length === 0) return;
  const cards = await model.travarCards(client, pokemonIds);
  if (cards.length !== pokemonIds.length || cards.some((p) => p.dono_id !== donoId)) throw new ErroJogo(mensagem);
  if (cards.some((p) => p.posicao_time !== null)) {
    throw new ErroJogo('Pokémon do time de batalha não podem ser trocados. Tire-os do time antes.');
  }
}

/** Passa Pokécoins de um treinador para outro, com o extrato dos dois lados */
async function moverPokecoins(client, {
  deId, paraId, valor, anuncioId, motivoSaida, motivoEntrada,
}) {
  if (valor <= 0) return;
  const saldo = await carteira.debitar(client, {
    usuarioId: deId, valor, motivo: motivoSaida, anuncioId,
  });
  if (saldo === undefined) throw new ErroJogo('Pokécoins insuficientes para fechar essa troca.');
  await carteira.creditar(client, {
    usuarioId: paraId, valor, motivo: motivoEntrada, anuncioId,
  });
}

/**
 * Passa os cards para o novo dono (ver model.transferirCards).
 * Quem chamou já deve ter finalizado o próprio anúncio/proposta, para eles não entrarem aqui.
 */
async function transferirCards(client, pokemonIds, novoDonoId) {
  if (pokemonIds.length === 0) return;
  await model.transferirCards(client, pokemonIds, novoDonoId);
}

// ---------------------------------------------------------------------------
// Anúncios
// ---------------------------------------------------------------------------

/**
 * Anuncia um Pokémon da coleção (fora do time).
 * @param {number} usuarioId
 * @param {{ pokemonId: number, preco: number | null, aceitaPropostas: boolean }} dados
 */
async function criarAnuncio(usuarioId, { pokemonId, preco, aceitaPropostas }) {
  if (preco === null && !aceitaPropostas) {
    throw new ErroJogo('Defina um preço em Pokécoins, aceite propostas de troca, ou os dois.');
  }
  if (preco !== null && (!Number.isSafeInteger(preco) || preco < 1 || preco > config.PRECO_MAXIMO_ANUNCIO)) {
    throw new ErroJogo(`O preço precisa ser entre 1 e ${config.PRECO_MAXIMO_ANUNCIO} Pokécoins.`);
  }

  return transacao(async (client) => {
    await travarUsuarios(client, [usuarioId]);
    await travarCardsLivres(client, [pokemonId], usuarioId, 'Pokémon não encontrado.');

    const { ativos, jaAnunciado } = await model.contarAnunciosAtivos(client, usuarioId, pokemonId);
    if (jaAnunciado) throw new ErroJogo('Esse Pokémon já está anunciado.');
    if (ativos >= config.ANUNCIOS_ATIVOS_MAXIMO) {
      throw new ErroJogo(`Você já tem ${config.ANUNCIOS_ATIVOS_MAXIMO} anúncios ativos.`);
    }

    const id = await model.inserirAnuncio(client, {
      pokemonId, vendedorId: usuarioId, preco, aceitaPropostas,
    });
    return view.anuncio(await model.buscarAnuncioCompleto(client, id), usuarioId);
  });
}

/** O vendedor tira o anúncio do ar; as propostas pendentes são encerradas */
async function cancelarAnuncio(usuarioId, anuncioId) {
  await transacao(async (client) => {
    const anuncio = await lerAnuncio(client, anuncioId, { travar: true });
    if (anuncio.vendedor_id !== usuarioId) throw new ErroJogo('Anúncio não encontrado.');
    if (anuncio.status !== 'ativo') throw new ErroJogo('Esse anúncio já foi encerrado.');
    await model.cancelarAnuncio(client, anuncioId);
    await model.encerrarPropostasDoAnuncio(client, anuncioId);
  });
}

/** Compra direta pelo preço do anúncio. Devolve o card, já do comprador. */
async function comprar(usuarioId, anuncioId) {
  const previa = await lerAnuncio(pool, anuncioId);
  if (previa.vendedor_id === usuarioId) throw new ErroJogo('Você não pode comprar o próprio anúncio.');

  return transacao(async (client) => {
    await travarUsuarios(client, [usuarioId, previa.vendedor_id]);
    const anuncio = await travarAnuncioAtivo(client, anuncioId);
    if (anuncio.preco === null) throw new ErroJogo('Esse anúncio só aceita propostas de troca.');
    await travarCardsLivres(client, [anuncio.pokemon_id], anuncio.vendedor_id, 'Esse Pokémon não está mais disponível.');

    if ((await carteira.lerSaldo(client, usuarioId)) < anuncio.preco) throw new ErroJogo('Pokécoins insuficientes.');
    await moverPokecoins(client, {
      deId: usuarioId,
      paraId: anuncio.vendedor_id,
      valor: anuncio.preco,
      anuncioId,
      motivoSaida: 'compra_mercado',
      motivoEntrada: 'venda_mercado',
    });

    await model.fecharAnuncio(client, anuncioId, { status: 'vendido', compradorId: usuarioId });
    await transferirCards(client, [anuncio.pokemon_id], usuarioId);
    return buscarCard(client, anuncio.pokemon_id);
  });
}

// ---------------------------------------------------------------------------
// Propostas
// ---------------------------------------------------------------------------

/**
 * Oferece Pokémon e/ou Pokécoins por um anúncio que aceita propostas.
 * @param {number} usuarioId
 * @param {number} anuncioId
 * @param {{ pokemonIds: number[], pokecoins: number }} oferta
 */
async function proporTroca(usuarioId, anuncioId, { pokemonIds, pokecoins }) {
  if (!Number.isSafeInteger(pokecoins) || pokecoins < 0 || pokecoins > config.PRECO_MAXIMO_ANUNCIO) {
    throw new ErroJogo(`Ofereça entre 0 e ${config.PRECO_MAXIMO_ANUNCIO} Pokécoins.`);
  }
  if (pokemonIds.length > config.POKEMONS_POR_PROPOSTA || temRepetidos(pokemonIds)) {
    throw new ErroJogo(`Ofereça até ${config.POKEMONS_POR_PROPOSTA} Pokémon diferentes.`);
  }
  if (pokemonIds.length === 0 && pokecoins === 0) throw new ErroJogo('Ofereça pelo menos um Pokémon ou Pokécoins.');

  return transacao(async (client) => {
    await travarUsuarios(client, [usuarioId]);
    const anuncio = await travarAnuncioAtivo(client, anuncioId);
    if (anuncio.vendedor_id === usuarioId) throw new ErroJogo('Você não pode fazer proposta no próprio anúncio.');
    if (!anuncio.aceita_propostas) throw new ErroJogo('Esse anúncio não aceita propostas, só a compra direta.');
    await travarCardsLivres(client, pokemonIds, usuarioId, 'Algum desses Pokémon não é seu.');

    if (pokecoins > (await carteira.lerSaldo(client, usuarioId))) {
      throw new ErroJogo('Você não tem essa quantidade de Pokécoins.');
    }

    const pendentes = await model.contarPropostasPendentes(client, usuarioId, anuncioId);
    if (pendentes.neste > 0) throw new ErroJogo('Você já tem uma proposta pendente nesse anúncio. Cancele-a para mandar outra.');
    if (pendentes.total >= config.PROPOSTAS_PENDENTES_MAXIMO) {
      throw new ErroJogo(`Você já tem ${config.PROPOSTAS_PENDENTES_MAXIMO} propostas esperando resposta.`);
    }

    const id = await model.inserirProposta(client, {
      anuncioId, proponenteId: usuarioId, pokecoins, pokemonIds,
    });
    return { id };
  });
}

/** Propostas recebidas (nos meus anúncios) e enviadas: pendentes primeiro, depois as mais recentes */
async function listarPropostas(usuarioId) {
  return view.propostas(await model.listarPropostas(pool, usuarioId), usuarioId);
}

/** Lê a proposta (sem travar) e confere o papel de quem está respondendo */
async function lerProposta(propostaId, usuarioId, papel) {
  const proposta = await model.lerProposta(pool, propostaId);
  const dono = papel === 'vendedor' ? proposta?.vendedor_id : proposta?.proponente_id;
  if (!proposta || dono !== usuarioId) throw new ErroJogo('Proposta não encontrada.');
  return proposta;
}

async function travarPropostaPendente(client, propostaId) {
  const proposta = await model.travarProposta(client, propostaId);
  if (proposta.status !== 'pendente') throw new ErroJogo('Essa proposta já foi respondida.');
  return proposta;
}

/**
 * O dono do anúncio aceita: o Pokémon anunciado vai para o proponente e a oferta
 * (Pokémon + Pokécoins) vai para o dono do anúncio, tudo na mesma transação.
 */
async function aceitarProposta(usuarioId, propostaId) {
  const previa = await lerProposta(propostaId, usuarioId, 'vendedor');

  await transacao(async (client) => {
    await travarUsuarios(client, [usuarioId, previa.proponente_id]);
    const anuncio = await travarAnuncioAtivo(client, previa.anuncio_id);
    const proposta = await travarPropostaPendente(client, propostaId);
    const oferta = await model.pokemonsDaProposta(client, propostaId);

    await travarCardsLivres(client, [anuncio.pokemon_id], usuarioId, 'Seu Pokémon anunciado não está mais disponível.');
    await travarCardsLivres(
      client,
      oferta,
      proposta.proponente_id,
      'Algum Pokémon oferecido não está mais com esse treinador. Recuse a proposta.',
    );
    await moverPokecoins(client, {
      deId: proposta.proponente_id,
      paraId: usuarioId,
      valor: proposta.pokecoins,
      anuncioId: anuncio.id,
      motivoSaida: 'troca',
      motivoEntrada: 'troca',
    });

    await model.responderProposta(client, propostaId, 'aceita');
    await model.fecharAnuncio(client, anuncio.id, { status: 'trocado', compradorId: proposta.proponente_id });
    await transferirCards(client, [anuncio.pokemon_id], proposta.proponente_id);
    await transferirCards(client, oferta, usuarioId);
  });
}

/** Recusar (dono do anúncio) ou cancelar (quem mandou) uma proposta pendente */
async function encerrarProposta(usuarioId, propostaId, papel) {
  await lerProposta(propostaId, usuarioId, papel);
  await transacao(async (client) => {
    await travarPropostaPendente(client, propostaId);
    await model.responderProposta(client, propostaId, papel === 'vendedor' ? 'recusada' : 'cancelada');
  });
}

module.exports = {
  ORDENS_MERCADO,
  ORDENS_ANUNCIOS,
  listarMercado,
  listarAnunciosDaEspecie,
  listarMeusAnuncios,
  criarAnuncio,
  cancelarAnuncio,
  comprar,
  proporTroca,
  listarPropostas,
  aceitarProposta,
  recusarProposta: (usuarioId, propostaId) => encerrarProposta(usuarioId, propostaId, 'vendedor'),
  cancelarProposta: (usuarioId, propostaId) => encerrarProposta(usuarioId, propostaId, 'proponente'),
};
