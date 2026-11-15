// Migrações (db/migracoes) contra o schema completo (db/db.sql).
// Num banco novo o Docker roda o db.sql e, ao subir, o back aplica todas as migrações por cima
// (a tabela "migracoes" ainda não existe). Esse caminho precisa terminar no mesmo schema do db.sql,
// que é o que os outros testes usam. Rodar de novo não pode mudar nada.
const {
  describe, test, before, after, mock,
} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { recriarBanco, semBanco } = require('../helpers/ambiente');

const PASTA = path.join(__dirname, '../../../db/migracoes');
const ARQUIVOS = fs.readdirSync(PASTA).filter((nome) => nome.endsWith('.sql')).sort();

/**
 * Tudo o que define o schema public, num formato comparável com deepEqual.
 * A ordem das colunas fica de fora: uma migração sempre põe a coluna nova no fim da tabela.
 */
async function lerSchema(pool) {
  const consulta = async (sql) => (await pool.query(sql)).rows.map((r) => Object.values(r).join(' | ')).sort();
  return {
    colunas: await consulta(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
             numeric_precision, numeric_scale, is_identity, identity_generation
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name <> 'migracoes'`),
    restricoes: await consulta(`
      SELECT conrelid::regclass::text AS tabela, conname, contype, pg_get_constraintdef(oid) AS definicao,
             convalidated
        FROM pg_constraint
       WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text <> 'migracoes'`),
    indices: await consulta(`
      SELECT tablename, indexname, indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND tablename <> 'migracoes'`),
    sequencias: await consulta("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'"),
    gatilhos: await consulta("SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'"),
  };
}

describe('migrações', { skip: semBanco }, () => {
  let pool;
  let aplicarMigracoes;
  let schemaDoDbSql;

  before(async () => {
    await recriarBanco();
    process.env.DATABASE_URL = process.env.DATABASE_URL_TESTE;
    process.env.MIGRACOES_DIR = PASTA;
    ({ pool } = require('../../src/db'));
    ({ aplicarMigracoes } = require('../../src/migracoes'));
    // aplicarMigracoes anuncia cada arquivo aplicado; aqui isso só poluiria a saída
    mock.method(console, 'log', () => {});
    schemaDoDbSql = await lerSchema(pool);
  });
  after(async () => {
    mock.restoreAll();
    await pool?.end();
  });

  test('os arquivos seguem o padrão NNN_descricao.sql', () => {
    assert.ok(ARQUIVOS.length > 0);
    for (const nome of ARQUIVOS) assert.match(nome, /^\d{3}_[a-z0-9_]+\.sql$/, nome);
  });

  test('cada migração tem um número só dela', () => {
    const numeros = ARQUIVOS.map((nome) => nome.slice(0, 3));
    const repetidos = numeros.filter((n, i) => numeros.indexOf(n) !== i);
    assert.deepEqual(repetidos, []);
  });

  test('num banco criado pelo db.sql, aplicar todas as migrações não muda o schema', async () => {
    await aplicarMigracoes();
    const { rows } = await pool.query('SELECT nome FROM migracoes ORDER BY nome');
    assert.deepEqual(rows.map((r) => r.nome), ARQUIVOS, 'todas registradas, em ordem');
    assert.deepEqual(await lerSchema(pool), schemaDoDbSql);
  });

  test('subir o back de novo não reaplica nada', async () => {
    const { rows: antes } = await pool.query('SELECT nome, aplicada_em FROM migracoes ORDER BY nome');
    await aplicarMigracoes();
    const { rows: depois } = await pool.query('SELECT nome, aplicada_em FROM migracoes ORDER BY nome');
    assert.deepEqual(depois, antes);
  });

  test('cada arquivo pode rodar de novo sem erro e sem mudar o schema', async () => {
    for (const nome of ARQUIVOS) {
      await pool.query(fs.readFileSync(path.join(PASTA, nome), 'utf8'));
    }
    assert.deepEqual(await lerSchema(pool), schemaDoDbSql);
  });

  test('duas instâncias subindo juntas aplicam cada migração uma vez só', async () => {
    await recriarBanco();
    await Promise.all([aplicarMigracoes(), aplicarMigracoes()]);
    const { rows } = await pool.query('SELECT nome FROM migracoes ORDER BY nome');
    assert.deepEqual(rows.map((r) => r.nome), ARQUIVOS);
    assert.deepEqual(await lerSchema(pool), schemaDoDbSql);
  });

  test('migrações não apagam dados de um banco em uso', async () => {
    await recriarBanco();
    const { rows: [usuario] } = await pool.query(
      "INSERT INTO usuarios (login, celular, senha_hash, pokecoins) VALUES ('Ash', '11999999999', 'x', 500) RETURNING id",
    );
    await pool.query(
      "INSERT INTO transacoes_pokecoins (usuario_id, valor, motivo) VALUES ($1, 500, 'recompensa_afeto')", [usuario.id],
    );
    await aplicarMigracoes();
    const { rows } = await pool.query('SELECT u.pokecoins, t.motivo FROM usuarios u JOIN transacoes_pokecoins t ON t.usuario_id = u.id');
    assert.deepEqual(rows, [{ pokecoins: 500, motivo: 'recompensa_afeto' }]);
  });
});
