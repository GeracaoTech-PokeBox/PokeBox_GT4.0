// Trocas: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./trocas.controller');

const rotas = express.Router();

rotas.get('/mercado', autenticar, controller.mercado);
rotas.get('/mercado/:especieId', autenticar, controller.anunciosDaEspecie);

// /anuncios/meus antes de /anuncios/:id (que não tem GET, mas fica a ordem por clareza)
rotas.get('/anuncios/meus', autenticar, controller.meusAnuncios);
rotas.post('/anuncios', autenticar, controller.criarAnuncio);
rotas.delete('/anuncios/:id', autenticar, controller.cancelarAnuncio);
rotas.post('/anuncios/:id/comprar', autenticar, controller.comprar);
rotas.post('/anuncios/:id/propostas', autenticar, controller.propor);

rotas.get('/propostas', autenticar, controller.propostas);
rotas.post('/propostas/:id/aceitar', autenticar, controller.aceitarProposta);
rotas.post('/propostas/:id/recusar', autenticar, controller.recusarProposta);
rotas.delete('/propostas/:id', autenticar, controller.cancelarProposta);

module.exports = rotas;
