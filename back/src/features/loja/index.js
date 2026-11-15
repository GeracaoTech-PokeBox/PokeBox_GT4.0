// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./loja.rotas');
// A história usa o mesmo sorteio por raridade da loja para escolher os selvagens
const { sortearEspecieDaLoja } = require('./loja.service');

module.exports = { rotas, sortearEspecieDaLoja };
