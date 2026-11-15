// Golpes: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./golpes.controller');

const rotas = express.Router();

rotas.post('/pokemons/:id/golpes/roletar', autenticar, controller.roletar);
rotas.post('/pokemons/:id/golpes/desbloquear', autenticar, controller.desbloquear);

module.exports = rotas;
