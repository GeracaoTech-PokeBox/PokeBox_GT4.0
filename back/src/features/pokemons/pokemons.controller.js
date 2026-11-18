// Pokémon: lê e valida a requisição, chama o service e responde
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { inteiro } = require('../../compartilhado/validacao');
const service = require('./pokemons.service');

/** O usuário logado e a coleção dele */
async function eu(req, res) {
  res.json({ usuario: req.usuario, pokemons: await service.listarColecao(req.usuario.id) });
}

async function evoluir(req, res) {
  res.json(await service.evoluir(
    req.usuario.id,
    inteiro(req.params.id, 'Pokémon'),
    inteiro(req.body.especieId, 'Espécie'),
  ));
}

async function cuidar(req, res) {
  const { tipo } = req.body;
  if (!Object.hasOwn(config.CUIDADOS, tipo)) throw new ErroJogo('Cuidado inválido.');
  res.json(await service.cuidar(req.usuario.id, inteiro(req.params.id, 'Pokémon'), tipo));
}

async function cuidados(req, res) {
  res.json(await service.listarCuidados(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
}

module.exports = {
  eu, evoluir, cuidar, cuidados,
};
