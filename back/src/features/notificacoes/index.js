// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./notificacoes.rotas');
const { notificar, nomePokemon } = require('./notificacoes.service');

module.exports = { rotas, notificar, nomePokemon };
