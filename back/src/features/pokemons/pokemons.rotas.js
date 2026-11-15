// Pokémon: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./pokemons.controller');

const rotas = express.Router();

rotas.get('/eu', autenticar, controller.eu);
rotas.post('/pokemons/:id/evoluir', autenticar, controller.evoluir);
rotas.post('/pokemons/:id/cuidar', autenticar, controller.cuidar);
rotas.get('/pokemons/:id/cuidados', autenticar, controller.cuidados);

module.exports = rotas;
