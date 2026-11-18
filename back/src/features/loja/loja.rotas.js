// Loja: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./loja.controller');

const rotas = express.Router();

rotas.post('/eu/inicial', autenticar, controller.escolherInicial);
rotas.post('/loja/comprar', autenticar, controller.comprarPokemon);
rotas.post('/loja/pokebolas', autenticar, controller.comprarPokebolas);

module.exports = rotas;
