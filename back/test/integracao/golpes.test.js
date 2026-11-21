// Golpes especiais: roleta, desbloqueio pago e uso em batalha
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarTime } = require('../helpers/fabricas');

describe('golpes especiais', { skip: semBanco }, () => {
  let amb;
  let ash;
  let primeiro;
  let segundo;

  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());

  beforeEach(async () => {
    await amb.limparDados();
    ash = await criarTreinador('Ash', { pokecoins: 0 });
    [primeiro, segundo] = await criarTime(ash, { especies: [4, 1, 7], nivel: 60 });
  });

  const roletar = (id) => amb.api('POST', `/pokemons/${id}/golpes/roletar`, { token: ash.token });
  const desbloquear = (id) => amb.api('POST', `/pokemons/${id}/golpes/desbloquear`, { token: ash.token });
  const definirSaldo = (pokecoins) => amb.pool.query('UPDATE usuarios SET pokecoins = $2 WHERE id = $1', [ash.id, pokecoins]);
  const darAfetoMaximo = (id) => amb.pool.query('UPDATE pokemons SET afeto = 500 WHERE id = $1', [id]);

  test('a roleta exige afeto máximo', async () => {
    await amb.pool.query('UPDATE pokemons SET afeto = 400 WHERE id = $1', [primeiro]);
    assert.match((await roletar(primeiro)).dados.erro, /afeto máximo/);
  });

  test('desbloqueio pago (200) libera sem afeto e já faz a primeira roleta', async () => {
    await definirSaldo(150);
    assert.match((await desbloquear(segundo)).dados.erro, /200 Pokécoins/);

    await definirSaldo(250);
    const desbloqueio = await desbloquear(segundo);
    assert.equal(desbloqueio.status, 200, JSON.stringify(desbloqueio.dados));
    assert.equal(desbloqueio.dados.custo, 200);
    assert.equal(desbloqueio.dados.pokemon.golpesLiberados, true);
    assert.equal(desbloqueio.dados.pokemon.golpes.length, 3);
    assert.equal(await amb.saldo(ash.token), 50);
    assert.match((await desbloquear(segundo)).dados.erro, /já estão liberados/);
  });

  test('primeira roleta grátis com 3 golpes de dano da espécie; as seguintes custam 100', async () => {
    await darAfetoMaximo(primeiro);
    await definirSaldo(50);

    const roleta = await roletar(primeiro);
    assert.equal(roleta.status, 200, JSON.stringify(roleta.dados));
    assert.equal(roleta.dados.custo, 0);
    const { golpes } = roleta.dados.pokemon;
    assert.equal(golpes.length, 3);
    assert.equal(new Set(golpes.map((g) => g.id)).size, 3);
    assert.ok(golpes.every((g) => g.poder > 0 && g.classe !== 'status'));
    const { rows: [especie] } = await amb.pool.query('SELECT movimentos FROM especies WHERE id = 4');
    assert.ok(golpes.every((g) => especie.movimentos.includes(g.id)));
    assert.equal(roleta.dados.pokemon.custoRoletaGolpes, 100);

    assert.match((await roletar(primeiro)).dados.erro, /100 Pokécoins/);
    await definirSaldo(500);
    const outra = await roletar(primeiro);
    assert.equal(outra.dados.custo, 100);
    assert.equal(await amb.saldo(ash.token), 400);
  });

  test('o Pokémon nasce com 1 golpe; a roleta mantém esse golpe e dá mais 2', async () => {
    const misty = await criarTreinador('misty', { pokecoins: 1000 });
    const inicial = await amb.api('POST', '/eu/inicial', { token: misty.token, corpo: { especieId: 7 } });
    assert.equal(inicial.status, 201, JSON.stringify(inicial.dados));
    const [golpeInicial] = inicial.dados.golpes;
    assert.equal(inicial.dados.golpes.length, 1);
    assert.ok(golpeInicial.poder > 0);
    assert.equal(inicial.dados.golpesLiberados, false);
    assert.equal(inicial.dados.custoRoletaGolpes, 0);

    await darAfetoMaximo(inicial.dados.id);
    const rolar = () => amb.api('POST', `/pokemons/${inicial.dados.id}/golpes/roletar`, { token: misty.token });
    const primeira = await rolar();
    assert.equal(primeira.dados.custo, 0);
    assert.equal(primeira.dados.pokemon.golpes.length, 3);
    assert.equal(primeira.dados.pokemon.golpes[0].id, golpeInicial.id);

    const segunda = await rolar();
    assert.equal(segunda.dados.custo, 100);
    assert.equal(segunda.dados.pokemon.golpes.length, 3);
    assert.equal(segunda.dados.pokemon.golpes[0].id, golpeInicial.id);
  });

  test('ao subir, completa o golpe inicial e os extras de quem roletou na regra antiga', async () => {
    const { completarGolpesIniciais } = require('../../src/features/golpes');
    await amb.pool.query('UPDATE pokemons SET golpes = $2 WHERE id = $1', [segundo, [11, 13]]);
    await completarGolpesIniciais();
    const { rows } = await amb.pool.query('SELECT id, golpes FROM pokemons WHERE id = ANY($1)', [[primeiro, segundo]]);
    const golpesDe = (id) => rows.find((r) => r.id === id).golpes;
    assert.equal(golpesDe(primeiro).length, 1);
    assert.equal(golpesDe(segundo).length, 3);
    assert.deepEqual(golpesDe(segundo).slice(0, 2), [11, 13]);
  });

  test('não roleta nem desbloqueia o Pokémon de outro treinador', async () => {
    const gary = await criarTreinador('gary', { pokecoins: 1000 });
    await darAfetoMaximo(primeiro);
    assert.equal((await amb.api('POST', `/pokemons/${primeiro}/golpes/roletar`, { token: gary.token })).status, 404);
    assert.equal((await amb.api('POST', `/pokemons/${segundo}/golpes/desbloquear`, { token: gary.token })).status, 404);
    assert.equal(await amb.saldo(gary.token), 1000);
  });

  test('em batalha o golpe gasta PP e aparece no histórico', async () => {
    await darAfetoMaximo(primeiro);
    const { golpes } = (await roletar(primeiro)).dados.pokemon;

    const encontro = (await amb.api('POST', '/historia/explorar', { token: ash.token })).dados;
    let { batalha } = (await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: ash.token })).dados;
    const emCampo = () => batalha.estado.lados[0].pokemons[batalha.estado.lados[0].ativo];
    assert.equal(emCampo().pokemonId, primeiro);
    const ppAntes = emCampo().golpes[0].pp;

    const usar = (indice) => amb.api('POST', `/historia/encontros/${encontro.id}/jogadas`, {
      token: ash.token, corpo: { tipo: 'golpe', indice },
    });
    assert.equal((await usar(5)).status, 400);
    const usou = await usar(0);
    assert.equal(usou.status, 200, JSON.stringify(usou.dados));
    batalha = usou.dados.batalha;

    // O último turno é do selvagem, a não ser que o golpe tenha acabado com a batalha
    const eventoDoGolpe = batalha.log.at(batalha.fim ? -1 : -2).eventos[0];
    assert.ok(eventoDoGolpe.tipo === 'errou' || eventoDoGolpe.golpe === golpes[0].nome);
    if (!batalha.fim) assert.equal(emCampo().golpes[0].pp, ppAntes - 1);
  });
});
