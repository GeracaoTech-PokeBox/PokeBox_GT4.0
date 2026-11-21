// Endpoints do jogo (montados em /api pelo app.js). Todos respondem JSON; erros de regra voltam como
// 400 { erro: "mensagem" }. Cada feature tem a própria pasta em src/features, com rotas, controller,
// service, model e (quando precisa) view; aqui só se monta cada uma, na ordem.
const express = require('express');
const contas = require('./features/contas');
const pokemons = require('./features/pokemons');
const golpes = require('./features/golpes');
const loja = require('./features/loja');
const time = require('./features/time');
const vitrines = require('./features/vitrines');
const treinadores = require('./features/treinadores');
const trocas = require('./features/trocas');
const historia = require('./features/historia');
const batalhas = require('./features/batalhas');
const notificacoes = require('./features/notificacoes');
const { tratarErros } = require('./compartilhado/middlewares/tratarErros');

const router = express.Router();
// Aqui dentro (e não no app) para o erro de JSON inválido cair no tratamento de erros deste router
router.use(express.json({ limit: '10kb' }));

router.use(contas.rotas); // /auth/...
router.use(pokemons.rotas); // /eu, /pokemons/:id/evoluir, /cuidar, /cuidados
router.use(golpes.rotas); // /pokemons/:id/golpes/...
router.use(loja.rotas); // /eu/inicial, /loja/...
router.use(time.rotas); // /time
router.use(vitrines.rotas); // /vitrines, /vitrine
router.use(treinadores.rotas); // /treinadores, /treinadores/ativos, /presenca
router.use(trocas.rotas); // /mercado, /anuncios, /propostas
router.use(historia.rotas); // /historia/...
router.use(batalhas.rotas); // /batalhas/...
router.use(notificacoes.rotas); // /notificacoes

// Sempre por último: erros lançados em qualquer rota acima caem aqui
router.use(tratarErros);

module.exports = router;
