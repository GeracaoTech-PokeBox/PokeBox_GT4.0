// Batalhas: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./batalhas.controller');

const rotas = express.Router();

rotas.get('/batalhas', autenticar, controller.listar);
rotas.post('/batalhas', autenticar, controller.desafiar);
rotas.get('/batalhas/:id', autenticar, controller.obter);
rotas.post('/batalhas/:id/responder', autenticar, controller.responder);
rotas.post('/batalhas/:id/jogadas', autenticar, controller.jogar);

module.exports = rotas;
