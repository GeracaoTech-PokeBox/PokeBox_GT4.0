// Trocas: lê e valida a requisição, chama o service e responde
const { ErroJogo } = require('../../compartilhado/erros');
const { inteiro, busca, opcao } = require('../../compartilhado/validacao');
const service = require('./trocas.service');

// ---------------------------------------------------------------------------
// Mercado e anúncios
// ---------------------------------------------------------------------------

async function mercado(req, res) {
  res.json(await service.listarMercado(
    busca(req.query.busca, 40),
    opcao(req.query.ordem, service.ORDENS_MERCADO, 'popularidade'),
  ));
}

async function anunciosDaEspecie(req, res) {
  res.json(await service.listarAnunciosDaEspecie(
    req.usuario.id,
    inteiro(req.params.especieId, 'Espécie'),
    opcao(req.query.ordem, service.ORDENS_ANUNCIOS, 'preco'),
  ));
}

async function meusAnuncios(req, res) {
  res.json(await service.listarMeusAnuncios(req.usuario.id));
}

async function criarAnuncio(req, res) {
  const { preco = null, aceitaPropostas = false } = req.body;
  res.status(201).json(await service.criarAnuncio(req.usuario.id, {
    pokemonId: inteiro(req.body.pokemonId, 'Pokémon'),
    preco: preco === null ? null : Number(preco),
    aceitaPropostas: aceitaPropostas === true,
  }));
}

async function cancelarAnuncio(req, res) {
  await service.cancelarAnuncio(req.usuario.id, inteiro(req.params.id, 'Anúncio'));
  res.status(204).end();
}

async function comprar(req, res) {
  res.json(await service.comprar(req.usuario.id, inteiro(req.params.id, 'Anúncio')));
}

// ---------------------------------------------------------------------------
// Propostas
// ---------------------------------------------------------------------------

async function propor(req, res) {
  const { pokemonIds = [], pokecoins = 0 } = req.body;
  if (!Array.isArray(pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
  res.status(201).json(await service.proporTroca(req.usuario.id, inteiro(req.params.id, 'Anúncio'), {
    pokemonIds: pokemonIds.map((id) => inteiro(id, 'Pokémon')),
    pokecoins: Number(pokecoins),
  }));
}

async function propostas(req, res) {
  res.json(await service.listarPropostas(req.usuario.id));
}

async function aceitarProposta(req, res) {
  await service.aceitarProposta(req.usuario.id, inteiro(req.params.id, 'Proposta'));
  res.status(204).end();
}

async function recusarProposta(req, res) {
  await service.recusarProposta(req.usuario.id, inteiro(req.params.id, 'Proposta'));
  res.status(204).end();
}

async function cancelarProposta(req, res) {
  await service.cancelarProposta(req.usuario.id, inteiro(req.params.id, 'Proposta'));
  res.status(204).end();
}

module.exports = {
  mercado,
  anunciosDaEspecie,
  meusAnuncios,
  criarAnuncio,
  cancelarAnuncio,
  comprar,
  propor,
  propostas,
  aceitarProposta,
  recusarProposta,
  cancelarProposta,
};
