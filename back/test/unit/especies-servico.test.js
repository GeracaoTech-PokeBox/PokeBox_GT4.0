// Cache de espécies com dublês de banco e PokeAPI (sem Postgres e sem rede):
// criarServicoEspecies recebe as dependências de fora
const test = require('node:test');
const assert = require('node:assert/strict');
const { criarServicoEspecies } = require('../../src/features/especies/especies.service');

const PIKACHU = { id: 25, nome: 'pikachu', taxa_captura: 190, evolucoes: [] };

/** Banco falso: devolve `linhas` em todo SELECT e anota cada consulta */
function dbFalso(linhas = []) {
  const consultas = [];
  return {
    consultas,
    query: async (sql, params) => {
      consultas.push({ sql, params });
      return { rows: sql.trim().startsWith('SELECT') ? linhas : [], rowCount: 0 };
    },
  };
}

test('espécie nova: busca na PokeAPI e grava no banco', async () => {
  const db = dbFalso();
  const pokeapi = { buscarEspecie: async () => PIKACHU, buscarTaxaCaptura: async () => assert.fail('não deveria buscar') };

  const especie = await criarServicoEspecies({ db, pokeapi }).garantirEspecie(25);

  assert.equal(especie, PIKACHU);
  assert.ok(db.consultas.some(({ sql }) => sql.includes('INSERT INTO especies')));
});

test('espécie já salva: não vai à PokeAPI', async () => {
  const db = dbFalso([PIKACHU]);
  const pokeapi = { buscarEspecie: async () => assert.fail('não deveria buscar'), buscarTaxaCaptura: async () => assert.fail('não deveria buscar') };

  assert.deepEqual(await criarServicoEspecies({ db, pokeapi }).garantirEspecie(25), PIKACHU);
});

test('espécie antiga sem taxa de captura: completa só a taxa', async () => {
  const db = dbFalso([{ ...PIKACHU, taxa_captura: null }]);
  const pokeapi = { buscarEspecie: async () => assert.fail('não deveria buscar'), buscarTaxaCaptura: async () => 190 };

  const especie = await criarServicoEspecies({ db, pokeapi }).garantirEspecie(25);

  assert.equal(especie.taxa_captura, 190);
  assert.ok(db.consultas.some(({ sql }) => sql.includes('UPDATE especies SET taxa_captura')));
});
