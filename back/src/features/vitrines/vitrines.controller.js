// Vitrines: lê e valida a requisição, chama o service e responde
const { ErroJogo } = require('../../compartilhado/erros');
const {
  LOGIN_MAXIMO, texto, inteiro, busca,
} = require('../../compartilhado/validacao');
const service = require('./vitrines.service');

async function listar(req, res) {
  res.json(await service.listarVitrines(req.usuario.id, busca(req.query.busca, LOGIN_MAXIMO)));
}

async function obter(req, res) {
  const login = texto(req.params.login, 'o treinador').slice(0, LOGIN_MAXIMO);
  res.json(await service.obterVitrine(req.usuario.id, login));
}

async function salvar(req, res) {
  const { bio = '', estilo, pokemonIds } = req.body;
  if (typeof bio !== 'string') throw new ErroJogo('Apresentação inválida.');
  if (!Array.isArray(pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
  await service.salvarVitrine(req.usuario.id, {
    bio: bio.trim(),
    estilo,
    pokemonIds: pokemonIds.map((id) => inteiro(id, 'Pokémon')),
  });
  res.status(204).end();
}

module.exports = { listar, obter, salvar };
