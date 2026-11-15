// Treinadores: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./treinadores.controller');

const rotas = express.Router();

rotas.get('/treinadores', autenticar, controller.buscar);
rotas.get('/treinadores/ativos', autenticar, controller.ativos);
rotas.post('/presenca', autenticar, controller.presenca);

module.exports = rotas;
