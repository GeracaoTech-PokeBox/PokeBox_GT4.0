// Golpes: lê e valida a requisição, chama o service e responde
const { inteiro } = require('../../compartilhado/validacao');
const service = require('./golpes.service');

async function roletar(req, res) {
  res.json(await service.roletarGolpes(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
}

async function desbloquear(req, res) {
  res.json(await service.desbloquearGolpes(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
}

module.exports = { roletar, desbloquear };
