// Vitrine pública e lista de treinadores online
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon, criarTime } = require('../helpers/fabricas');

describe('vitrine e presença', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());
  beforeEach(() => amb.limparDados());

  test('vitrine: sem destaques mostra o time; visitante conta visita e não vê IVs', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    const time = await criarTime(ash);
    await criarPokemon(gary);

    let { dados } = await amb.api('GET', '/vitrines/ash', { token: ash.token });
    assert.equal(dados.souDono, true);
    assert.equal(dados.destaques.length, 3);
    assert.equal(dados.estatisticas.pokemons, 3);
    assert.ok(dados.colecao.length >= 1);

    const ids = time.slice(0, 2);
    const salvar = await amb.api('PUT', '/vitrine', {
      token: ash.token, corpo: { bio: 'Fã de tipo fogo', estilo: 'album', pokemonIds: ids },
    });
    assert.equal(salvar.status, 204);

    ({ dados } = await amb.api('GET', '/vitrines/ASH', { token: gary.token }));
    assert.equal(dados.souDono, false);
    assert.equal(dados.bio, 'Fã de tipo fogo');
    assert.equal(dados.estilo, 'album');
    assert.equal(dados.visitas, 1);
    assert.deepEqual(dados.destaques.map((p) => p.id), ids);
    assert.equal(dados.destaques[0].ivs, undefined);

    // O dono olhando a própria vitrine não conta visita
    await amb.api('GET', '/vitrines/ash', { token: ash.token });
    assert.equal((await amb.api('GET', '/vitrines/ash', { token: gary.token })).dados.visitas, 2);

    const lista = await amb.api('GET', '/vitrines', { token: gary.token });
    assert.deepEqual(lista.dados.map((v) => v.login), ['Ash']);
  });

  test('vitrine: recusa Pokémon de outro, estilo inválido e treinador inexistente', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    await criarTime(ash);
    const doGary = await criarPokemon(gary);
    const salvar = (corpo) => amb.api('PUT', '/vitrine', { token: ash.token, corpo });

    assert.equal((await salvar({ estilo: 'palco', pokemonIds: [doGary] })).status, 400);
    assert.equal((await salvar({ estilo: 'neon', pokemonIds: [] })).status, 400);
    assert.equal((await amb.api('GET', '/vitrines/ninguem', { token: ash.token })).status, 404);
  });

  test('vitrine: apresentação de até 160 caracteres e até 6 destaques diferentes', async () => {
    const ash = await criarTreinador('Ash');
    const ids = [];
    for (let i = 0; i < 7; i += 1) ids.push(await criarPokemon(ash));
    const salvar = (corpo) => amb.api('PUT', '/vitrine', { token: ash.token, corpo: { estilo: 'palco', pokemonIds: [], ...corpo } });

    assert.match((await salvar({ bio: 'x'.repeat(161) })).dados.erro, /160 caracteres/);
    assert.match((await salvar({ pokemonIds: ids })).dados.erro, /até 6 Pokémon/);
    assert.match((await salvar({ pokemonIds: [ids[0], ids[0]] })).dados.erro, /até 6 Pokémon/);
    assert.equal((await salvar({ bio: 'x'.repeat(160), pokemonIds: ids.slice(0, 6) })).status, 204);
  });

  test('buscar treinadores: pelo começo do login, sem incluir quem busca, com % e _ literais', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    await criarTreinador('ashley');
    await criarTreinador('a_b');
    await criarTreinador('axb');
    const buscar = async (quem, busca) => (await amb.api('GET', `/treinadores?busca=${encodeURIComponent(busca)}`, { token: quem.token })).dados;

    assert.deepEqual(await buscar(gary, 'AS'), ['Ash', 'ashley']);
    assert.deepEqual(await buscar(ash, 'as'), ['ashley']);
    assert.deepEqual(await buscar(gary, 'a_'), ['a_b']);
    assert.deepEqual(await buscar(gary, '%'), []);
    assert.deepEqual(await buscar(gary, '  '), [], 'busca vazia não lista todo mundo');
  });

  test('treinadores online: time completo, acesso nas últimas 24h e sinal de vida recente', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    await criarTreinador('misty'); // sem time completo: nunca aparece
    await criarTime(ash);
    await criarTime(gary);
    const ativosParaGary = async () => (await amb.api('GET', '/treinadores/ativos', { token: gary.token })).dados;

    let dados = await ativosParaGary();
    assert.deepEqual(dados.map((d) => d.login), ['Ash']);
    assert.equal(dados[0].time.length, 3);
    assert.equal(dados[0].nivelMedio, 1);
    assert.equal(dados[0].desafioEnviado, false);

    // Quem não entra há mais de 24h some da lista...
    await amb.pool.query("UPDATE usuarios SET ultimo_acesso_em = now() - interval '25 hours' WHERE id = $1", [ash.id]);
    assert.deepEqual(await ativosParaGary(), []);
    // ...e volta assim que usa o jogo de novo
    await amb.api('GET', '/eu', { token: ash.token });
    assert.deepEqual((await ativosParaGary()).map((d) => d.login), ['Ash']);

    // Entrou hoje mas está offline (sem sinal de vida há 2 min): some da lista
    await amb.pool.query("UPDATE usuarios SET online_em = now() - interval '2 minutes' WHERE id = $1", [ash.id]);
    assert.deepEqual(await ativosParaGary(), []);
    // O sinal de vida do front deixa online de novo
    assert.equal((await amb.api('POST', '/presenca', { token: ash.token })).status, 204);
    assert.deepEqual((await ativosParaGary()).map((d) => d.login), ['Ash']);

    // Sair da conta deixa offline na hora
    await amb.api('POST', '/auth/sair', { token: ash.token });
    assert.deepEqual(await ativosParaGary(), []);
  });
});
