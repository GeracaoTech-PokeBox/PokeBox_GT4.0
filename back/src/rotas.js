// Endpoints do jogo. Todos respondem JSON; erros de regra voltam como 400 { erro: "mensagem" }.
const express = require('express');
const batalhas = require('./jogo/batalhas');
const trocas = require('./jogo/trocas');
const historia = require('./jogo/historia');
const contas = require('./features/contas');
const pokemons = require('./features/pokemons');
const golpes = require('./features/golpes');
const loja = require('./features/loja');
const time = require('./features/time');
const vitrines = require('./features/vitrines');
const treinadores = require('./features/treinadores');
const config = require('./compartilhado/config');
const { ErroJogo } = require('./compartilhado/erros');
const {
  texto, inteiro, busca, opcao, acaoDe,
} = require('./compartilhado/validacao');
const { tratarErros } = require('./compartilhado/middlewares/tratarErros');

const { autenticar } = contas;

const router = express.Router();
// Aqui dentro (e não no app) para o erro de JSON inválido cair no tratamento de erros deste router
router.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// Features já no formato novo (src/features/<nome>)
// ---------------------------------------------------------------------------

router.use(contas.rotas); // /auth/...
router.use(pokemons.rotas); // /eu, /pokemons/:id/evoluir, /cuidar, /cuidados
router.use(golpes.rotas); // /pokemons/:id/golpes/...
router.use(loja.rotas); // /eu/inicial, /loja/...
router.use(time.rotas); // /time
router.use(vitrines.rotas); // /vitrines, /vitrine
router.use(treinadores.rotas); // /treinadores, /treinadores/ativos, /presenca

// ---------------------------------------------------------------------------
// Trocas
// ---------------------------------------------------------------------------

router.get('/mercado', autenticar, async (req, res) => {
  res.json(await trocas.listarMercado(
    busca(req.query.busca, 40),
    opcao(req.query.ordem, trocas.ORDENS_MERCADO, 'popularidade'),
  ));
});

router.get('/mercado/:especieId', autenticar, async (req, res) => {
  res.json(await trocas.listarAnunciosDaEspecie(
    req.usuario.id,
    inteiro(req.params.especieId, 'Espécie'),
    opcao(req.query.ordem, trocas.ORDENS_ANUNCIOS, 'preco'),
  ));
});

router.get('/anuncios/meus', autenticar, async (req, res) => {
  res.json(await trocas.listarMeusAnuncios(req.usuario.id));
});

router.post('/anuncios', autenticar, async (req, res) => {
  const { preco = null, aceitaPropostas = false } = req.body;
  res.status(201).json(await trocas.criarAnuncio(req.usuario.id, {
    pokemonId: inteiro(req.body.pokemonId, 'Pokémon'),
    preco: preco === null ? null : Number(preco),
    aceitaPropostas: aceitaPropostas === true,
  }));
});

router.delete('/anuncios/:id', autenticar, async (req, res) => {
  await trocas.cancelarAnuncio(req.usuario.id, inteiro(req.params.id, 'Anúncio'));
  res.status(204).end();
});

router.post('/anuncios/:id/comprar', autenticar, async (req, res) => {
  res.json(await trocas.comprar(req.usuario.id, inteiro(req.params.id, 'Anúncio')));
});

router.post('/anuncios/:id/propostas', autenticar, async (req, res) => {
  const { pokemonIds = [], pokecoins = 0 } = req.body;
  if (!Array.isArray(pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
  res.status(201).json(await trocas.proporTroca(req.usuario.id, inteiro(req.params.id, 'Anúncio'), {
    pokemonIds: pokemonIds.map((id) => inteiro(id, 'Pokémon')),
    pokecoins: Number(pokecoins),
  }));
});

router.get('/propostas', autenticar, async (req, res) => {
  res.json(await trocas.listarPropostas(req.usuario.id));
});

router.post('/propostas/:id/aceitar', autenticar, async (req, res) => {
  await trocas.aceitarProposta(req.usuario.id, inteiro(req.params.id, 'Proposta'));
  res.status(204).end();
});

router.post('/propostas/:id/recusar', autenticar, async (req, res) => {
  await trocas.recusarProposta(req.usuario.id, inteiro(req.params.id, 'Proposta'));
  res.status(204).end();
});

router.delete('/propostas/:id', autenticar, async (req, res) => {
  await trocas.cancelarProposta(req.usuario.id, inteiro(req.params.id, 'Proposta'));
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// História
// ---------------------------------------------------------------------------

router.get('/historia', autenticar, async (req, res) => {
  res.json(await historia.obterHistoria(req.usuario.id));
});

router.post('/historia/explorar', autenticar, async (req, res) => {
  res.json(await historia.explorar(req.usuario.id));
});

router.post('/historia/encontros/:id/batalha', autenticar, async (req, res) => {
  res.json(await historia.iniciarBatalha(req.usuario.id, inteiro(req.params.id, 'Encontro')));
});

router.post('/historia/trilhas/:trilha/pontos/:ponto/refazer', autenticar, async (req, res) => {
  const trilha = inteiro(req.params.trilha, 'Trilha');
  const ponto = inteiro(req.params.ponto, 'Ponto');
  if (trilha > config.HISTORIA_TRILHAS || ponto > config.HISTORIA_PONTOS_POR_TRILHA) throw new ErroJogo('Ponto inválido.');
  res.json(await historia.refazerPonto(req.usuario.id, trilha, ponto));
});

router.post('/historia/encontros/:id/jogadas', autenticar, async (req, res) => {
  res.json(await historia.jogar(req.usuario.id, inteiro(req.params.id, 'Encontro'), acaoDe(req.body)));
});

router.post('/historia/encontros/:id/capturar', autenticar, async (req, res) => {
  res.json(await historia.capturar(req.usuario.id, inteiro(req.params.id, 'Encontro')));
});

router.post('/historia/encontros/:id/ignorar', autenticar, async (req, res) => {
  res.json(await historia.ignorar(req.usuario.id, inteiro(req.params.id, 'Encontro')));
});

// ---------------------------------------------------------------------------
// Batalhas
// ---------------------------------------------------------------------------

router.get('/batalhas', autenticar, async (req, res) => {
  res.json(await batalhas.listarBatalhas(req.usuario.id));
});

router.post('/batalhas', autenticar, async (req, res) => {
  res.status(201).json(await batalhas.desafiar(req.usuario.id, texto(req.body.oponente, 'o treinador')));
});

router.get('/batalhas/:id', autenticar, async (req, res) => {
  res.json(await batalhas.obterBatalha(req.usuario.id, inteiro(req.params.id, 'Batalha')));
});

router.post('/batalhas/:id/responder', autenticar, async (req, res) => {
  res.json(await batalhas.responderDesafio(
    req.usuario.id,
    inteiro(req.params.id, 'Batalha'),
    req.body.aceitar === true,
  ));
});

router.post('/batalhas/:id/jogadas', autenticar, async (req, res) => {
  res.json(await batalhas.jogar(req.usuario.id, inteiro(req.params.id, 'Batalha'), acaoDe(req.body)));
});

// Sempre por último: erros lançados em qualquer rota acima caem aqui
router.use(tratarErros);

module.exports = router;
