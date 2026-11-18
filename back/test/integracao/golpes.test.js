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
    assert.equal(desbloqueio.dados.pokemon.golpes.length, 2);
    assert.equal(await amb.saldo(ash.token), 50);
    assert.match((await desbloquear(segundo)).dados.erro, /já estão liberados/);
  });

  test('primeira roleta grátis com 2 golpes de dano da espécie; as seguintes custam 100', async () => {
    await darAfetoMaximo(primeiro);
    await definirSaldo(50);

    const roleta = await roletar(primeiro);
    assert.equal(roleta.status, 200, JSON.stringify(roleta.dados));
    assert.equal(roleta.dados.custo, 0);
    const { golpes } = roleta.dados.pokemon;
    assert.equal(golpes.length, 2);
    assert.notEqual(golpes[0].id, golpes[1].id);
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
