// Endpoints do jogo. Todos respondem JSON; erros de regra voltam como 400 { erro: "mensagem" }.
const express = require('express');
const usuarios = require('./jogo/usuarios');
const pokemons = require('./jogo/pokemons');
const batalhas = require('./jogo/batalhas');
const trocas = require('./jogo/trocas');
const historia = require('./jogo/historia');
const golpes = require('./jogo/golpes');
const vitrines = require('./features/vitrines');
const config = require('./compartilhado/config');
const { ErroJogo } = require('./compartilhado/erros');
const {
  LOGIN_MAXIMO, texto, inteiro, busca, opcao, acaoDe,
} = require('./compartilhado/validacao');
const { autenticar, tokenDe } = require('./compartilhado/middlewares/autenticar');
const { limitarTentativas } = require('./compartilhado/middlewares/limitarTentativas');
const { tratarErros } = require('./compartilhado/middlewares/tratarErros');

const SENHA_MINIMA = 8;
const CELULAR = /^\d{11}$/;

const router = express.Router();
// Aqui dentro (e não no app) para o erro de JSON inválido cair no tratamento de erros deste router
router.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// Validação dos dados de conta
// ---------------------------------------------------------------------------

function dadosConta(corpo, { comSenha = true } = {}) {
  const login = texto(corpo.login, 'o usuário');
  if (login.length > LOGIN_MAXIMO) throw new ErroJogo(`O usuário pode ter no máximo ${LOGIN_MAXIMO} caracteres.`);
  const celular = texto(corpo.celular, 'o celular');
  if (!CELULAR.test(celular)) throw new ErroJogo('Informe um celular válido com DDD.');
  if (!comSenha) return { login, celular };
  if (typeof corpo.senha !== 'string' || corpo.senha.length < SENHA_MINIMA) {
    throw new ErroJogo(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  return { login, celular, senha: corpo.senha };
}

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

const conta = express.Router();
conta.use(limitarTentativas({ maximo: 20, janelaMs: 15 * 60 * 1000 }));

conta.post('/cadastro', async (req, res) => {
  res.status(201).json(await usuarios.cadastrarUsuario(dadosConta(req.body)));
});

conta.post('/login', async (req, res) => {
  res.json(await usuarios.entrar(texto(req.body.login, 'o usuário'), texto(req.body.senha, 'a senha')));
});

conta.post('/verificar', async (req, res) => {
  const { login, celular } = dadosConta(req.body, { comSenha: false });
  res.json({ encontrado: await usuarios.existeUsuario(login, celular) });
});

conta.post('/redefinir-senha', async (req, res) => {
  await usuarios.redefinirSenha(dadosConta(req.body));
  res.status(204).end();
});

router.use('/auth', conta);

router.post('/auth/sair', autenticar, async (req, res) => {
  await usuarios.encerrarSessao(tokenDe(req));
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Coleção, loja e time
// ---------------------------------------------------------------------------

router.get('/eu', autenticar, async (req, res) => {
  res.json({ usuario: req.usuario, pokemons: await pokemons.listarColecao(req.usuario.id) });
});

router.post('/eu/inicial', autenticar, async (req, res) => {
  res.status(201).json(await usuarios.escolherInicial(req.usuario.id, inteiro(req.body.especieId, 'Pokémon')));
});

router.post('/loja/comprar', autenticar, async (req, res) => {
  res.status(201).json(await usuarios.comprarPokemonAleatorio(req.usuario.id, inteiro(req.body.geracao, 'Geração')));
});

router.post('/loja/pokebolas', autenticar, async (req, res) => {
  res.status(201).json(await usuarios.comprarPokebolas(req.usuario.id, inteiro(req.body.quantidade, 'Quantidade')));
});

router.put('/time', autenticar, async (req, res) => {
  if (!Array.isArray(req.body.pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
  await usuarios.definirTime(req.usuario.id, req.body.pokemonIds.map((id) => inteiro(id, 'Pokémon')));
  res.status(204).end();
});

router.post('/pokemons/:id/evoluir', autenticar, async (req, res) => {
  res.json(await pokemons.evoluir(
    req.usuario.id,
    inteiro(req.params.id, 'Pokémon'),
    inteiro(req.body.especieId, 'Espécie'),
  ));
});

router.post('/pokemons/:id/cuidar', autenticar, async (req, res) => {
  const { tipo } = req.body;
  if (!Object.hasOwn(config.CUIDADOS, tipo)) throw new ErroJogo('Cuidado inválido.');
  res.json(await pokemons.cuidar(req.usuario.id, inteiro(req.params.id, 'Pokémon'), tipo));
});

router.post('/pokemons/:id/golpes/roletar', autenticar, async (req, res) => {
  res.json(await golpes.roletarGolpes(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
});

router.post('/pokemons/:id/golpes/desbloquear', autenticar, async (req, res) => {
  res.json(await golpes.desbloquearGolpes(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
});

router.get('/pokemons/:id/cuidados', autenticar, async (req, res) => {
  res.json(await pokemons.listarCuidados(req.usuario.id, inteiro(req.params.id, 'Pokémon')));
});

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
// Vitrine (já no formato novo: features/vitrines)
// ---------------------------------------------------------------------------

router.use(vitrines.rotas);

router.get('/treinadores', autenticar, async (req, res) => {
  const termo = busca(req.query.busca, LOGIN_MAXIMO);
  res.json(termo ? await usuarios.buscarTreinadores(req.usuario.id, termo) : []);
});

// Sinal de vida do front com o jogo aberto: o autenticar já marca o treinador como online
router.post('/presenca', autenticar, (req, res) => {
  res.status(204).end();
});

// Quem entrou no jogo nas últimas 24h, está online e pode ser desafiado (time completo)
router.get('/treinadores/ativos', autenticar, async (req, res) => {
  res.json(await usuarios.listarTreinadoresAtivos(req.usuario.id));
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
