// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./golpes.rotas');
const { sortearGolpeInicial, completarGolpesIniciais } = require('./golpes.service');

module.exports = { rotas, sortearGolpeInicial, completarGolpesIniciais };
