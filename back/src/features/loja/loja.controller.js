// Loja: lê e valida a requisição, chama o service e responde
const { inteiro } = require('../../compartilhado/validacao');
const service = require('./loja.service');

async function escolherInicial(req, res) {
  res.status(201).json(await service.escolherInicial(req.usuario.id, inteiro(req.body.especieId, 'Pokémon')));
}

async function comprarPokemon(req, res) {
  res.status(201).json(await service.comprarPokemonAleatorio(req.usuario.id, inteiro(req.body.geracao, 'Geração')));
}

async function comprarPokebolas(req, res) {
  res.status(201).json(await service.comprarPokebolas(req.usuario.id, inteiro(req.body.quantidade, 'Quantidade')));
}

module.exports = { escolherInicial, comprarPokemon, comprarPokebolas };
