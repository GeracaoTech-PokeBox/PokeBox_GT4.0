// Treinadores: lê e valida a requisição, chama o service e responde
const { LOGIN_MAXIMO, busca } = require('../../compartilhado/validacao');
const service = require('./treinadores.service');

async function buscar(req, res) {
  const termo = busca(req.query.busca, LOGIN_MAXIMO);
  res.json(termo ? await service.buscarTreinadores(req.usuario.id, termo) : []);
}

// Sinal de vida do front com o jogo aberto: o autenticar já marca o treinador como online
function presenca(req, res) {
  res.status(204).end();
}

// Quem entrou no jogo nas últimas 24h, está online e pode ser desafiado (time completo)
async function ativos(req, res) {
  res.json(await service.listarTreinadoresAtivos(req.usuario.id));
}

module.exports = { buscar, presenca, ativos };
