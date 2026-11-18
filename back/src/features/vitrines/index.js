// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./vitrines.rotas');
const { obterVitrine, salvarVitrine, listarVitrines } = require('./vitrines.service');

module.exports = {
  rotas, obterVitrine, salvarVitrine, listarVitrines,
};
