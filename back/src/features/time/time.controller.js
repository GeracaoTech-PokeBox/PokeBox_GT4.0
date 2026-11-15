// Time de batalha: lê e valida a requisição, chama o service e responde
const { ErroJogo } = require('../../compartilhado/erros');
const { inteiro } = require('../../compartilhado/validacao');
const service = require('./time.service');

async function definir(req, res) {
  if (!Array.isArray(req.body.pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
  await service.definirTime(req.usuario.id, req.body.pokemonIds.map((id) => inteiro(id, 'Pokémon')));
  res.status(204).end();
}

module.exports = { definir };
