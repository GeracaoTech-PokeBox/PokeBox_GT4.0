// Pokémon inicial, loja de Pokémon, pokébolas e montagem do time
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon, criarTime } = require('../helpers/fabricas');
const { instalarPokeApiFake } = require('../helpers/pokeapi-fake');

describe('loja e time', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());
  beforeEach(() => amb.limparDados());

  describe('inicial', () => {
    test('só aceita espécies iniciais e entra na posição 1 com a linha de evolução', async () => {
      const ash = await criarTreinador('Ash');
      const inicial = (especieId) => amb.api('POST', '/eu/inicial', { token: ash.token, corpo: { especieId } });

      assert.equal((await inicial(25)).status, 400);
      const charmander = await inicial(4);
      assert.equal(charmander.status, 201);
      assert.equal(charmander.dados.nome, 'charmander');
      assert.equal(charmander.dados.posicaoTime, 1);
      assert.deepEqual(charmander.dados.evolucoes.map((e) => [e.especieId, e.nivel]), [[5, 16]]);
    });

    test('não dá para escolher um segundo inicial, nem com dois cliques ao mesmo tempo', async () => {
      const ash = await criarTreinador('Ash');
      const inicial = (especieId) => amb.api('POST', '/eu/inicial', { token: ash.token, corpo: { especieId } });

      const juntos = await Promise.all([inicial(4), inicial(7)]);
      assert.deepEqual(juntos.map((r) => r.status).sort(), [201, 400]);
      assert.equal((await inicial(1)).status, 400);
      const { rows } = await amb.pool.query('SELECT count(*)::int AS total FROM pokemons WHERE dono_id = $1', [ash.id]);
      assert.equal(rows[0].total, 1);
    });
  });

  describe('loja', () => {
    test('geração inexistente ou ausente é recusada sem cobrar', async () => {
      const ash = await criarTreinador('Ash', { pokecoins: 200 });
      for (const corpo of [{ geracao: 10 }, { geracao: 0 }, {}]) {
        assert.equal((await amb.api('POST', '/loja/comprar', { token: ash.token, corpo })).status, 400);
      }
      assert.equal(await amb.saldo(ash.token), 200);
    });

    test('compras simultâneas: o débito atômico só deixa passar o que o saldo paga', async () => {
      const ash = await criarTreinador('Ash', { pokecoins: 200 });
      const compras = await Promise.all(
        [1, 2, 3].map(() => amb.api('POST', '/loja/comprar', { token: ash.token, corpo: { geracao: 1 } })),
      );
      assert.deepEqual(compras.map((c) => c.status).sort(), [201, 201, 400]);
      assert.equal(await amb.saldo(ash.token), 0);
      for (const c of compras.filter((x) => x.status === 201)) {
        assert.ok(c.dados.pokemon.especieId >= 1 && c.dados.pokemon.especieId <= 151, 'loja 1 só sorteia Kanto');
      }
      const { rows } = await amb.pool.query(
        "SELECT valor FROM transacoes_pokecoins WHERE usuario_id = $1 AND motivo = 'compra_loja'", [ash.id],
      );
      assert.deepEqual(rows.map((r) => r.valor), [-100, -100]);
    });

    test('cada loja sorteia só a sua geração, e as compras completam o time', async () => {
      const gary = await criarTreinador('gary');
      await criarPokemon(gary, { especieId: 7, posicaoTime: 1, origem: 'inicial' });

      for (let i = 0; i < 2; i += 1) {
        const compra = await amb.api('POST', '/loja/comprar', { token: gary.token, corpo: { geracao: 9 } });
        assert.equal(compra.status, 201);
        assert.ok(compra.dados.pokemon.especieId >= 906 && compra.dados.pokemon.especieId <= 1025, 'loja 9 só sorteia Paldea');
      }

      const { dados } = await amb.api('GET', '/eu', { token: gary.token });
      assert.equal(dados.pokemons.length, 3);
      assert.deepEqual(dados.pokemons.map((p) => p.posicaoTime).sort(), [1, 2, 3]);
      assert.equal(new Set(dados.pokemons.map((p) => p.mintNumero)).size, 3);
      for (const p of dados.pokemons) {
        assert.ok(Object.values(p.ivs).every((iv) => iv >= 0 && iv <= 31));
        assert.ok(['comum', 'lendario', 'mitico'].includes(p.raridade));
        assert.ok(p.status.hp > 0 && p.alturaM > 0 && p.pesoKg > 0);
      }

      // Com o time cheio, o próximo fica só na coleção
      const extra = await amb.api('POST', '/loja/comprar', { token: gary.token, corpo: { geracao: 9 } });
      assert.equal(extra.dados.pokemon.posicaoTime, null);
    });

    test('PokeAPI fora do ar: sorteia entre as espécies salvas; sem nenhuma salva, 503 sem cobrar', async (t) => {
      const ash = await criarTreinador('Ash', { pokecoins: 200 });
      const comprar = () => amb.api('POST', '/loja/comprar', { token: ash.token, corpo: { geracao: 9 } });
      t.mock.method(console, 'warn', () => {});
      t.mock.method(console, 'error', () => {});

      // Só a 906 (comum) salva na faixa da geração 9; depois a PokeAPI cai.
      // require aqui dentro: o pool do banco só pode carregar depois do prepararAmbiente
      const { garantirEspecie } = require('../../src/features/especies');
      await amb.pool.query('DELETE FROM especies WHERE id BETWEEN 906 AND 1025');
      await garantirEspecie(906);
      instalarPokeApiFake(t, () => new TypeError('fetch failed'));

      const compra = await comprar();
      assert.equal(compra.status, 201, JSON.stringify(compra.dados));
      assert.equal(compra.dados.pokemon.especieId, 906);
      assert.equal(await amb.saldo(ash.token), 100);

      await amb.pool.query('DELETE FROM pokemons');
      await amb.pool.query('DELETE FROM especies WHERE id BETWEEN 906 AND 1025');
      const semEspecie = await comprar();
      assert.equal(semEspecie.status, 503);
      assert.match(semEspecie.dados.erro, /PokeAPI/);
      assert.equal(await amb.saldo(ash.token), 100);
    });
  });

  test('pokébolas: quantidade válida, saldo suficiente e contagem no perfil', async () => {
    const ash = await criarTreinador('Ash', { pokecoins: 1000 });
    const comprar = (quantidade) => amb.api('POST', '/loja/pokebolas', { token: ash.token, corpo: { quantidade } });

    assert.equal((await comprar(0)).status, 400);
    assert.equal((await comprar(100)).status, 400);
    const compra = await comprar(3);
    assert.equal(compra.status, 201, JSON.stringify(compra.dados));
    assert.deepEqual(compra.dados, { saldo: 970, pokebolas: 3 });
    assert.equal((await amb.api('GET', '/eu', { token: ash.token })).dados.usuario.pokebolas, 3);

    await amb.pool.query('UPDATE usuarios SET pokecoins = 5 WHERE id = $1', [ash.id]);
    assert.equal((await comprar(1)).status, 400);
    assert.equal(await amb.saldo(ash.token), 5);
  });

  test('montar time: reordena e recusa time incompleto, repetido ou com Pokémon de outro', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    const ids = (await criarTime(ash)).reverse();
    const doGary = await criarPokemon(gary);
    const montar = (pokemonIds) => amb.api('PUT', '/time', { token: ash.token, corpo: { pokemonIds } });

    assert.equal((await montar(ids)).status, 204);
    const { dados } = await amb.api('GET', '/eu', { token: ash.token });
    assert.deepEqual(dados.pokemons.map((p) => p.id), ids);

    assert.equal((await montar(ids.slice(1))).status, 400);
    assert.equal((await montar([ids[0], ids[0], ids[1]])).status, 400);
    assert.equal((await montar([...ids.slice(1), doGary])).status, 400);
  });
});
