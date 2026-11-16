// Batalhas: lê e valida a requisição, chama o service e responde
const { texto, inteiro, acaoDe } = require('../../compartilhado/validacao');
const service = require('./batalhas.service');

async function listar(req, res) {
  res.json(await service.listarBatalhas(req.usuario.id));
}

async function desafiar(req, res) {
  res.status(201).json(await service.desafiar(req.usuario.id, texto(req.body.oponente, 'o treinador')));
}

async function obter(req, res) {
  res.json(await service.obterBatalha(req.usuario.id, inteiro(req.params.id, 'Batalha')));
}

async function responder(req, res) {
  res.json(await service.responderDesafio(
    req.usuario.id,
    inteiro(req.params.id, 'Batalha'),
    req.body.aceitar === true,
  ));
}

async function jogar(req, res) {
  res.json(await service.jogar(req.usuario.id, inteiro(req.params.id, 'Batalha'), acaoDe(req.body)));
}

module.exports = {
  listar, desafiar, obter, responder, jogar,
};
