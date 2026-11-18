// Espécies: cache local da Pokédex. Cada espécie é buscada na PokeAPI uma única vez e salva na tabela especies.
//
// A regra recebe de fora onde guardar (db) e de onde buscar (pokeapi), então dá para testá-la sem
// banco e sem rede (criarServicoEspecies com dublês). O módulo exporta uma instância pronta com o
// pool e a PokeAPI de verdade, então quem usa não muda nada.
const { pool } = require('../../banco/db');
const model = require('./especies.model');
const pokeapiReal = require('./especies.pokeapi');

/**
 * @param {{ db?: { query: Function }, pokeapi?: { buscarEspecie: Function, buscarTaxaCaptura: Function } }} [dependencias]
 */
function criarServicoEspecies({ db = pool, pokeapi = pokeapiReal } = {}) {
  /**
   * capture_rate da espécie (especies.taxa_captura). Espécies salvas antes dessa coluna existir
   * ficam com NULL e são completadas aqui na primeira vez. Chame fora de transação: pode ir à PokeAPI.
   * @param {number} id
   */
  async function garantirTaxaCaptura(id) {
    const salva = await model.lerTaxaCaptura(db, id);
    if (salva != null) return salva;

    const taxaCaptura = await pokeapi.buscarTaxaCaptura(id);
    await model.salvarTaxaCaptura(db, id, taxaCaptura);
    return taxaCaptura;
  }

  /**
   * Garante que a espécie está no banco e a devolve.
   * Chame ANTES de abrir uma transação: esperar a PokeAPI com uma transação
   * aberta seguraria locks de outros jogadores.
   * @param {number} id
   * @returns {Promise<import('../../nucleo/regras').Especie>}
   */
  async function garantirEspecie(id) {
    const salva = await model.buscarPorId(db, id);
    if (salva) {
      if (salva.taxa_captura == null) salva.taxa_captura = await garantirTaxaCaptura(id);
      return salva;
    }

    const especie = await pokeapi.buscarEspecie(id);
    await model.inserir(db, especie);
    return especie;
  }

  return { garantirEspecie, garantirTaxaCaptura };
}

module.exports = { ...criarServicoEspecies(), criarServicoEspecies };
