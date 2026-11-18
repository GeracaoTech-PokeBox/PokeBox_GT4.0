// Partes do app que respondem sem tocar no banco: proxy da PokeAPI, CORS, saúde, documentação,
// autenticação ausente e o formato dos erros. A PokeAPI é falsa (helpers/pokeapi-fake).
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { instalarPokeApiFake } = require('../helpers/pokeapi-fake');

const app = require('../../src/app');
const { pool } = require('../../src/banco/db');

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
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: resposta.status, dados, cabecalhos: resposta.headers };
}

const postJson = (corpo) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo });

// ---------------------------------------------------------------------------
// Proxy da PokeAPI
// ---------------------------------------------------------------------------

test('proxy da PokeAPI', async (t) => {
  await t.test('repassa o caminho e devolve o JSON', async (t2) => {
    const { chamadas } = instalarPokeApiFake(t2, { '/pokemon/charmander': { id: 4, name: 'charmander' } });
    const { status, dados, cabecalhos } = await chamar('/api/pokeapi/pokemon/charmander');
    assert.equal(status, 200);
    assert.deepEqual(dados, { id: 4, name: 'charmander' });
    assert.match(cabecalhos.get('content-type'), /application\/json/);
    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0].href, 'https://pokeapi.co/api/v2/pokemon/charmander');
  });

  await t.test('só repassa limit e offset da query', async (t2) => {
    const { chamadas } = instalarPokeApiFake(t2, { '/pokemon': { results: [] } });
    await chamar('/api/pokeapi/pokemon?limit=20&offset=40&chave=segredo');
    assert.equal(chamadas[0].searchParams.get('limit'), '20');
    assert.equal(chamadas[0].searchParams.get('offset'), '40');
    assert.equal(chamadas[0].searchParams.has('chave'), false);
  });

  await t.test('mantém o status da PokeAPI (ex.: 404)', async (t2) => {
    instalarPokeApiFake(t2, {});
    assert.equal((await chamar('/api/pokeapi/pokemon/nao-existe')).status, 404);
  });

  await t.test('recusa caminhos fora do formato sem chamar a PokeAPI', async (t2) => {
    const { chamadas } = instalarPokeApiFake(t2, {});
    for (const caminho of ['/a/b/c', '/pokemon/char%2Fmander', '/pokemon/a.b', '/']) {
      const { status } = await chamar(`/api/pokeapi${caminho}`);
      assert.equal(status, 400, caminho);
    }
    assert.equal(chamadas.length, 0);
  });

  await t.test('só aceita GET', async (t2) => {
    const { chamadas } = instalarPokeApiFake(t2, {});
    assert.equal((await chamar('/api/pokeapi/pokemon/1', { method: 'POST' })).status, 405);
    assert.equal(chamadas.length, 0);
  });

  await t.test('PokeAPI fora do ar vira 502', async (t2) => {
    instalarPokeApiFake(t2, { '/pokemon/1': new TypeError('fetch failed') });
    const { status, dados } = await chamar('/api/pokeapi/pokemon/1');
    assert.equal(status, 502);
    assert.ok(dados.erro);
  });
});

// ---------------------------------------------------------------------------
// Saúde e CORS
// ---------------------------------------------------------------------------

test('saúde responde sem banco', async () => {
  assert.deepEqual(await chamar('/api/saude').then((r) => [r.status, r.dados]), [200, { ok: true }]);
});

test('documentação: Swagger UI e especificação respondem sem login e sem banco', async () => {
  const pagina = await chamar('/api/docs/');
  assert.equal(pagina.status, 200);
  assert.match(pagina.cabecalhos.get('content-type'), /text\/html/);
  assert.match(pagina.dados, /<title>PokeBox API<\/title>/);

  const { status, dados } = await chamar('/api/docs/openapi.json');
  assert.equal(status, 200);
  assert.equal(dados.info.title, 'PokeBox API');
  assert.ok(dados.paths['/saude']);
});

test('CORS: preflight 204 com os cabeçalhos', async () => {
  const { status, cabecalhos } = await chamar('/api/eu', { method: 'OPTIONS' });
  assert.equal(status, 204);
  assert.equal(cabecalhos.get('access-control-allow-origin'), '*');
  assert.match(cabecalhos.get('access-control-allow-headers'), /Authorization/);
});

// ---------------------------------------------------------------------------
// Autenticação e formato dos erros
// ---------------------------------------------------------------------------

test('rota protegida sem token ou com token mal formado dá 401', async () => {
  assert.equal((await chamar('/api/eu')).status, 401);
  assert.equal((await chamar('/api/eu', { headers: { Authorization: 'Basic abc' } })).status, 401);
  assert.equal((await chamar('/api/eu', { headers: { Authorization: "Bearer a'b" } })).status, 401);
  assert.deepEqual((await chamar('/api/batalhas')).dados, { erro: 'Faça login para continuar.' });
});

test('JSON inválido dá 400 com mensagem', async () => {
  const { status, dados } = await chamar('/api/auth/login', postJson('{login:'));
  assert.equal(status, 400);
  assert.deepEqual(dados, { erro: 'JSON inválido.' });
});

test('validação do cadastro dá 400 antes de ir ao banco', async () => {
  const valido = { login: 'ash', celular: '11999999999', senha: 'pikachu123' };
  const casos = [
    [{ ...valido, login: '' }, /usuário/],
    [{ ...valido, login: 'x'.repeat(21) }, /no máximo 20/],
    [{ ...valido, celular: '1199999999' }, /celular válido/],
    [{ ...valido, celular: '119999999aa' }, /celular válido/],
    [{ ...valido, senha: '1234567' }, /pelo menos 8/],
    [{ ...valido, senha: 12345678 }, /pelo menos 8/],
  ];
  for (const [corpo, mensagem] of casos) {
    const { status, dados } = await chamar('/api/auth/cadastro', postJson(JSON.stringify(corpo)));
    assert.equal(status, 400, JSON.stringify(corpo));
    assert.match(dados.erro, mensagem);
  }
});

test('corpo acima de 10kb é recusado como 413, sem log de erro interno', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const { status, dados } = await chamar('/api/auth/login', postJson(JSON.stringify({ login: 'a', senha: 'x'.repeat(20_000) })));
  assert.equal(status, 413);
  assert.ok(dados.erro);
  assert.equal(log.mock.callCount(), 0);
});
