// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos.
// Espécies não tem rotas próprias na API do jogo: as outras features pedem a espécie por aqui
// (garantirEspecie) e o front lê a Pokédex pelo proxy, montado no app.js.
const { garantirEspecie, garantirTaxaCaptura } = require('./especies.service');
const { mapearCadeia } = require('./especies.pokeapi');
const { proxyPokeApi } = require('./especies.proxy');

module.exports = {
  garantirEspecie, garantirTaxaCaptura, mapearCadeia, proxyPokeApi,
};
