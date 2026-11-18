// Time de batalha: lê e valida a requisição, chama o service e responde
const { pokemonIds } = require('../../compartilhado/validacao');
const service = require('./time.service');

async function definir(req, res) {
  await service.definirTime(req.usuario.id, pokemonIds(req.body.pokemonIds));
  res.status(204).end();
}

module.exports = { definir };
