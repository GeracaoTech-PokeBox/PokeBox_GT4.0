// Notificações: lê e valida a requisição, chama o service e responde
const { inteiro } = require('../../compartilhado/validacao');
const service = require('./notificacoes.service');

async function listar(req, res) {
  res.json(await service.listar(req.usuario.id));
}

async function ver(req, res) {
  res.json(await service.ver(req.usuario.id, inteiro(req.params.id, 'Notificação')));
}

module.exports = { listar, ver };
