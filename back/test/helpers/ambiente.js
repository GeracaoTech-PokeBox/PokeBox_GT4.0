// Ambiente dos testes de integração: banco de teste recriado, PokeAPI sintética e o app numa porta livre.
// Cada arquivo de teste roda no próprio processo e chama prepararAmbiente() uma vez;
// limparDados() zera as tabelas entre um teste e outro, para nenhum depender do anterior.
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { mock } = require('node:test');
const { Client } = require('pg');
const { instalarPokeApiFake } = require('./pokeapi-fake');
const { pokeApiSintetica } = require('./pokeapi-sintetica');

const URL_TESTE = process.env.DATABASE_URL_TESTE;

/** Para usar em test(..., { skip: semBanco }) */
const semBanco = URL_TESTE ? false : 'defina DATABASE_URL_TESTE (ou rode npm run test:int)';

// O cache da PokeAPI fica entre os testes: as espécies e golpes são sempre os mesmos
const TABELAS_MANTIDAS = ['especies', 'golpes'];

/** Apaga o schema public e recria tudo com o db/db.sql */
async function recriarBanco() {
  const admin = new Client({ connectionString: URL_TESTE });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT current_database() AS nome');
    if (!rows[0].nome.endsWith('_teste')) {
      throw new Error(`O banco de teste precisa terminar em _teste (é "${rows[0].nome}"): ele é apagado a cada execução.`);
    }
    await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await admin.query(fs.readFileSync(path.join(__dirname, '../../../db/db.sql'), 'utf8'));
  } finally {
    await admin.end();
  }
}

/**
 * @typedef {object} Ambiente
 * @property {import('pg').Pool} pool
 * @property {(metodo: string, caminho: string, opcoes?: { token?: string, corpo?: object }) =>
 *   Promise<{ status: number, dados: any }>} api   chama /api<caminho> no app de teste
 * @property {(token: string) => Promise<number>} saldo  Pokécoins do dono do token
 * @property {() => Promise<void>} limparDados
 * @property {() => Promise<Record<string, string[]>>} fotografar  todas as linhas de todas as tabelas do jogo,
 *   para conferir com deepEqual que uma chamada não mudou nada
 * @property {() => Promise<void>} encerrar
 */

// Mudam a cada requisição autenticada (presença), então ficam fora da foto do banco
const COLUNAS_VOLATEIS = { usuarios: ['ultimo_acesso_em', 'online_em'] };

/** @returns {Promise<Ambiente>} */
async function prepararAmbiente() {
  await recriarBanco();
  instalarPokeApiFake(mock, pokeApiSintetica);

  // O pool do src/db.js lê DATABASE_URL quando é carregado, então ela vem antes do require
  process.env.DATABASE_URL = URL_TESTE;
  const app = require('../../src/app');
  const { pool } = require('../../src/db');

  const servidor = app.listen(0);
  await once(servidor, 'listening');
  const base = `http://localhost:${servidor.address().port}`;

  async function api(metodo, caminho, { token, corpo } = {}) {
    const resposta = await fetch(`${base}/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const texto = await resposta.text();
    return { status: resposta.status, dados: texto ? JSON.parse(texto) : null };
  }

  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT (tablename = ANY($1))",
    [TABELAS_MANTIDAS],
  );
  const nomes = rows.map((r) => r.tablename).sort();
  const tabelas = nomes.map((nome) => `"${nome}"`).join(', ');

  async function fotografar() {
    const foto = {};
    for (const nome of nomes) {
      const { rows: linhas } = await pool.query(`SELECT to_jsonb(t) AS linha FROM "${nome}" t`);
      foto[nome] = linhas
        .map(({ linha }) => {
          for (const coluna of COLUNAS_VOLATEIS[nome] ?? []) delete linha[coluna];
          return JSON.stringify(linha);
        })
        .sort();
    }
    return foto;
  }

  return {
    pool,
    api,
    fotografar,
    saldo: async (token) => (await api('GET', '/eu', { token })).dados.usuario.pokecoins,
    limparDados: () => pool.query(`TRUNCATE ${tabelas} RESTART IDENTITY CASCADE`),
    encerrar: async () => {
      servidor.close();
      await pool.end();
      mock.restoreAll();
    },
  };
}

module.exports = { prepararAmbiente, recriarBanco, semBanco };
