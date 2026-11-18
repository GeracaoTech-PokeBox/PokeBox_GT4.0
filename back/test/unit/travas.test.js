// As travas só valem dentro de uma transação: com o pool, FOR UPDATE não segura nada
const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { travarUsuario, travarUsuarios } = require('../../src/banco/travas');

test('travar com o pool (fora de transação) dá erro na hora, sem ir ao banco', async () => {
  const pool = new Pool(); // nunca conecta: o erro vem antes da consulta
  await assert.rejects(travarUsuario(pool, 1), /fora de uma transação/);
  await assert.rejects(travarUsuarios(pool, [1, 2]), /fora de uma transação/);
  await pool.end();
});

test('com o client de uma transação, trava os usuários em ordem de id', async () => {
  const consultas = [];
  const client = { query: async (sql, params) => { consultas.push({ sql, params }); } };
  await travarUsuarios(client, [2, 1]);
  assert.match(consultas[0].sql, /ORDER BY id FOR UPDATE/);
  assert.deepEqual(consultas[0].params, [[2, 1]]);
});
