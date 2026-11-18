// Pokémon: lê e valida a requisição, chama o service e responde
const { inteiro } = require('../../compartilhado/validacao');
const { tipoDeCuidado } = require('../../nucleo/regras');
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
  const tipo = tipoDeCuidado(req.body.tipo);
  res.json(await service.cuidar(req.usuario.id, inteiro(req.params.id, 'Pokémon'), tipo));
}

async function cuidados(req, res) {
  res.json(await service.listarCuidados(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
}

module.exports = {
  eu, evoluir, cuidar, cuidados,
};
