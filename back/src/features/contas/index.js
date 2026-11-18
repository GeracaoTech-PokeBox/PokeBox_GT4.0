// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const { autenticar } = require('./contas.autenticar');
const { cadastrarUsuario } = require('./contas.service');
const rotas = require('./contas.rotas');

module.exports = { rotas, autenticar, cadastrarUsuario };
