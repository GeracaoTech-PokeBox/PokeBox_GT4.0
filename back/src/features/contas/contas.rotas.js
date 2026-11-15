// Contas: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
const express = require('express');
const { limitarTentativas } = require('../../compartilhado/middlewares/limitarTentativas');
const { autenticar } = require('./contas.autenticar');
const controller = require('./contas.controller');

// Limite de tentativas por IP em tudo que passa por /auth (inclusive /auth/sair, como sempre foi).
// Fica num roteador próprio montado em /auth para req.path ser /login, /cadastro... e cada rota
// ter a sua contagem.
const auth = express.Router();
auth.use(limitarTentativas({ maximo: 20, janelaMs: 15 * 60 * 1000 }));
auth.post('/cadastro', controller.cadastrar);
auth.post('/login', controller.entrar);
auth.post('/verificar', controller.verificar);
auth.post('/redefinir-senha', controller.redefinirSenha);

const rotas = express.Router();
rotas.use('/auth', auth);
rotas.post('/auth/sair', autenticar, controller.sair);

module.exports = rotas;
