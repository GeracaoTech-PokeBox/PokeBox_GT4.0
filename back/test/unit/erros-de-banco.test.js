// O que o front recebe quando o banco falha: 503 com mensagem clara quando o banco está fora do ar
// ou mal configurado, e 500 genérico (sem detalhes internos) para qualquer outro erro inesperado.
// Sem banco de verdade: o app aponta para uma porta onde nada responde, e os outros erros são simulados.
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

// Antes de carregar o app: o pool do src/db.js lê a URL quando é criado
process.env.DATABASE_URL = 'postgres://pokebox:pokebox@127.0.0.1:1/pokebox';
const app = require('../../src/app');
const { pool } = require('../../src/db');

const FORA_DO_AR = 'O banco de dados está fora do ar. Tente de novo em instantes.';
const ERRO_INTERNO = 'Erro interno. Tente novamente.';

let base;
let servidor;

test.before(async () => {
  servidor = app.listen(0);
  await once(servidor, 'listening');
  base = `http://localhost:${servidor.address().port}`;
});
test.after(async () => {
  servidor.close();
  await pool.end();
});

async function chamar(caminho, opcoes = {}) {
  const resposta = await fetch(`${base}${caminho}`, opcoes);
  const texto = await resposta.text();
  return { status: resposta.status, texto, dados: texto ? JSON.parse(texto) : null };
}
const comToken = { headers: { Authorization: 'Bearer abc123' } };
const login = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'ash', senha: 'pikachu123' }) };

/** Faz toda consulta ao banco falhar com o erro dado */
function falharConsultas(t, erro) {
  t.mock.method(pool, 'query', async () => { throw erro; });
}
const erroPg = (code, message) => Object.assign(new Error(message), { code });

test('banco fora do ar: 503 com mensagem para o jogador e dica de configuração no log', async (t) => {
  const log = t.mock.method(console, 'error', () => {});

  for (const [caminho, opcoes] of [['/api/eu', comToken], ['/api/auth/login', login]]) {
    const { status, dados } = await chamar(caminho, opcoes);
    assert.equal(status, 503, caminho);
    assert.deepEqual(dados, { erro: FORA_DO_AR });
  }
  assert.equal(log.mock.callCount(), 2);
  assert.match(log.mock.calls[0].arguments[0], /Banco de dados indisponível \(ECONNREFUSED.*DATABASE_URL/);
});

test('saúde e proxy da PokeAPI continuam respondendo sem banco', async () => {
  assert.equal((await chamar('/api/saude')).status, 200);
  assert.equal((await chamar('/api/pokeapi/a/b/c')).status, 400);
});

test('senha errada, banco inexistente ou db.sql não aplicado também dão 503', async (t) => {
  t.mock.method(console, 'error', () => {});
  const casos = [
    erroPg('28P01', 'password authentication failed for user "pokebox"'),
    erroPg('28000', 'role "pokebox" does not exist'),
    erroPg('3D000', 'database "pokebox" does not exist'),
    erroPg('42P01', 'relation "sessoes" does not exist'),
  ];
  for (const erro of casos) {
    falharConsultas(t, erro);
    const { status, dados } = await chamar('/api/eu', comToken);
    assert.equal(status, 503, erro.code);
    assert.deepEqual(dados, { erro: FORA_DO_AR });
    t.mock.restoreAll();
    t.mock.method(console, 'error', () => {});
  }
});

test('erro inesperado: 500 genérico, sem mensagem, código ou pilha na resposta', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const segredo = 'duplicate key value violates unique constraint "usuarios_login_idx" em /app/src/jogo/usuarios.js:42';
  falharConsultas(t, erroPg('23505', segredo));

  const { status, dados, texto } = await chamar('/api/eu', comToken);
  assert.equal(status, 500);
  assert.deepEqual(dados, { erro: ERRO_INTERNO });
  for (const vazamento of ['23505', 'usuarios_login_idx', 'usuarios.js', 'at ']) {
    assert.ok(!texto.includes(vazamento), `a resposta não pode conter "${vazamento}"`);
  }
  // O detalhe fica só no log do servidor, para quem for investigar
  assert.equal(log.mock.callCount(), 1);
  assert.equal(log.mock.calls[0].arguments[0].message, segredo);
});

test('erro de programação (TypeError) também vira 500 genérico', async (t) => {
  t.mock.method(console, 'error', () => {});
  falharConsultas(t, new TypeError("Cannot read properties of undefined (reading 'id')"));
  const { status, dados } = await chamar('/api/auth/login', login);
  assert.equal(status, 500);
  assert.deepEqual(dados, { erro: ERRO_INTERNO });
});
