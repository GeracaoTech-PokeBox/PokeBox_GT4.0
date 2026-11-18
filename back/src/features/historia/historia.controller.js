// História: lê e valida a requisição, chama o service e responde
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const { inteiro, acaoDe } = require('../../compartilhado/validacao');
const service = require('./historia.service');

async function obter(req, res) {
  res.json(await service.obterHistoria(req.usuario.id));
}

async function explorar(req, res) {
  res.json(await service.explorar(req.usuario.id));
}

async function iniciarBatalha(req, res) {
  res.json(await service.iniciarBatalha(req.usuario.id, inteiro(req.params.id, 'Encontro')));
}

async function refazer(req, res) {
  const trilha = inteiro(req.params.trilha, 'Trilha');
  const ponto = inteiro(req.params.ponto, 'Ponto');
  if (trilha > config.HISTORIA_TRILHAS || ponto > config.HISTORIA_PONTOS_POR_TRILHA) throw new ErroJogo('Ponto inválido.');
  res.json(await service.refazerPonto(req.usuario.id, trilha, ponto));
}

async function jogar(req, res) {
  res.json(await service.jogar(req.usuario.id, inteiro(req.params.id, 'Encontro'), acaoDe(req.body)));
}

async function capturar(req, res) {
  res.json(await service.capturar(req.usuario.id, inteiro(req.params.id, 'Encontro')));
}

async function ignorar(req, res) {
  res.json(await service.ignorar(req.usuario.id, inteiro(req.params.id, 'Encontro')));
}

module.exports = {
  obter, explorar, iniciarBatalha, refazer, jogar, capturar, ignorar,
};
