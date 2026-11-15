// Vitrines: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./vitrines.controller');

const rotas = express.Router();

rotas.get('/vitrines', autenticar, controller.listar);
rotas.get('/vitrines/:login', autenticar, controller.obter);
rotas.put('/vitrine', autenticar, controller.salvar);

module.exports = rotas;
