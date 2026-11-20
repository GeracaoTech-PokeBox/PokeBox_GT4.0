// Notificações: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./notificacoes.controller');

const rotas = express.Router();

rotas.get('/notificacoes', autenticar, controller.listar);
rotas.post('/notificacoes/:id/ver', autenticar, controller.ver);

module.exports = rotas;
