// História: caminhos da API. Montado sem prefixo em src/rotas.js, então os caminhos aqui são os completos.
// O autenticar vai em cada rota (e não num router.use) porque este roteador recebe também as
// requisições das outras features que passam por ele.
const express = require('express');
const { autenticar } = require('../contas');
const controller = require('./historia.controller');

const rotas = express.Router();

rotas.get('/historia', autenticar, controller.obter);
rotas.post('/historia/explorar', autenticar, controller.explorar);
rotas.post('/historia/encontros/:id/batalha', autenticar, controller.iniciarBatalha);
rotas.post('/historia/trilhas/:trilha/pontos/:ponto/refazer', autenticar, controller.refazer);
rotas.post('/historia/encontros/:id/jogadas', autenticar, controller.jogar);
rotas.post('/historia/encontros/:id/capturar', autenticar, controller.capturar);
rotas.post('/historia/encontros/:id/ignorar', autenticar, controller.ignorar);

module.exports = rotas;
