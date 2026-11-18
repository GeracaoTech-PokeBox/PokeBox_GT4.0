// Espécies: cache local da Pokédex. Cada espécie é buscada na PokeAPI uma única vez e salva na tabela especies.
const { pool } = require('../../banco/db');
const model = require('./especies.model');
const pokeapi = require('./especies.pokeapi');

/**
 * capture_rate da espécie (especies.taxa_captura). Espécies salvas antes dessa coluna existir
 * ficam com NULL e são completadas aqui na primeira vez. Chame fora de transação: pode ir à PokeAPI.
 * @param {number} id
 */
async function garantirTaxaCaptura(id) {
  const salva = await model.lerTaxaCaptura(pool, id);
  if (salva != null) return salva;

  const taxaCaptura = await pokeapi.buscarTaxaCaptura(id);
  await model.salvarTaxaCaptura(pool, id, taxaCaptura);
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
  const salva = await model.buscarPorId(pool, id);
  if (salva) {
    if (salva.taxa_captura == null) salva.taxa_captura = await garantirTaxaCaptura(id);
    return salva;
  }

  const especie = await pokeapi.buscarEspecie(id);
  await model.inserir(pool, especie);
  return especie;
}

/**
 * Espécie aleatória entre as já salvas no banco, com id entre primeira e ultima (null se não há
 * nenhuma). Plano B do sorteio da loja quando a PokeAPI não responde.
 */
async function especieSalvaEntre(primeira, ultima, rng) {
  return (await model.sortearSalvaEntre(pool, primeira, ultima, rng)) ?? null;
}

module.exports = { garantirEspecie, garantirTaxaCaptura, especieSalvaEntre };
