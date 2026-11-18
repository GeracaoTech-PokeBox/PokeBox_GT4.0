// Cuidados (afeto, humor, energia, recompensa de coração) e evolução
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon } = require('../helpers/fabricas');

describe('cuidados e evolução', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());
  beforeEach(() => amb.limparDados());

  const cuidar = (token, id, tipo) => amb.api('POST', `/pokemons/${id}/cuidar`, { token, corpo: { tipo } });

  test('cuidados: afeto sobe, cada cuidado tem espera e só o dono cuida', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    const id = await criarPokemon(ash, { especieId: 4, posicaoTime: 1 });

    const carinho = await cuidar(ash.token, id, 'carinho');
    assert.equal(carinho.status, 200, JSON.stringify(carinho.dados));
    assert.equal(carinho.dados.ganho, 10);
    assert.equal(carinho.dados.pokemon.afeto.pontos, 10);
    assert.ok(new Date(carinho.dados.pokemon.cuidadosDisponiveisEm.carinho) > new Date());
    assert.equal(carinho.dados.pokemon.cuidadosDisponiveisEm.brincar, null);
    assert.equal(carinho.dados.pokemon.humor, 65);
    assert.equal(carinho.dados.pokemon.energia, 50);

    // Dois cliques seguidos: o segundo esbarra na espera
    assert.equal((await cuidar(ash.token, id, 'carinho')).status, 400);
    const brincar = await cuidar(ash.token, id, 'brincar');
    assert.equal(brincar.status, 200);
    assert.deepEqual([brincar.dados.pokemon.humor, brincar.dados.pokemon.energia], [90, 25]);
    assert.equal((await cuidar(ash.token, id, 'dormir')).status, 400);
    assert.equal((await cuidar(gary.token, id, 'alimentar')).status, 404);

    const { dados } = await amb.api('GET', '/eu', { token: ash.token });
    assert.equal(dados.pokemons.find((p) => p.id === id).afeto.pontos, 30);
  });

  test('histórico de cuidados é privado do dono', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    const id = await criarPokemon(ash);
    await cuidar(ash.token, id, 'carinho');
    await cuidar(ash.token, id, 'brincar');

    const historico = await amb.api('GET', `/pokemons/${id}/cuidados`, { token: ash.token });
    assert.deepEqual(historico.dados.map((c) => c.tipo), ['brincar', 'carinho']);
    assert.deepEqual((await amb.api('GET', `/pokemons/${id}/cuidados`, { token: gary.token })).dados, []);
  });

  test('cada coração completo paga 100 Pokécoins, uma vez só', async () => {
    const ash = await criarTreinador('Ash', { pokecoins: 500 });
    const id = await criarPokemon(ash);
    // Libera a espera do alimentar e põe o afeto onde o teste precisa
    const prepararAlimentar = (afeto) => Promise.all([
      amb.pool.query("DELETE FROM cuidados WHERE pokemon_id = $1 AND tipo = 'alimentar'", [id]),
      amb.pool.query('UPDATE pokemons SET afeto = $2 WHERE id = $1', [id, afeto]),
    ]);

    await prepararAlimentar(90);
    const completou = await cuidar(ash.token, id, 'alimentar');
    assert.equal(completou.status, 200, JSON.stringify(completou.dados));
    assert.equal(completou.dados.pokemon.afeto.coracoes, 1);
    assert.equal(completou.dados.pokecoins, 100);
    assert.equal(await amb.saldo(ash.token), 600);

    // Sem completar coração novo
    await prepararAlimentar(100);
    assert.equal((await cuidar(ash.token, id, 'alimentar')).dados.pokecoins, 0);

    // Perdeu o afeto (numa troca, por exemplo) e completou de novo o mesmo coração: não paga outra vez
    await prepararAlimentar(90);
    assert.equal((await cuidar(ash.token, id, 'alimentar')).dados.pokecoins, 0);
    assert.equal(await amb.saldo(ash.token), 600);
  });

  test('evolução no nível da PokeAPI mantém mint, shiny e IVs e soma o bônus sorteado', async () => {
    const ash = await criarTreinador('Ash');
    const id = await criarPokemon(ash, { especieId: 4, posicaoTime: 1, nivel: 15 });
    const evoluir = (especieId) => amb.api('POST', `/pokemons/${id}/evoluir`, { token: ash.token, corpo: { especieId } });

    const cedo = await evoluir(5);
    assert.equal(cedo.status, 400);
    assert.match(cedo.dados.erro, /nível 16/);

    await amb.pool.query('UPDATE pokemons SET nivel = 16 WHERE id = $1', [id]);
    const card = (await amb.api('GET', '/eu', { token: ash.token })).dados.pokemons.find((p) => p.id === id);
    const evoluiu = await evoluir(5);
    assert.equal(evoluiu.status, 200);
    assert.equal(evoluiu.dados.nome, 'charmeleon');
    assert.equal(evoluiu.dados.mintNumero, card.mintNumero);
    assert.equal(evoluiu.dados.shiny, card.shiny);
    assert.deepEqual(evoluiu.dados.ivs, card.ivs);
    assert.equal(evoluiu.dados.nivel, 16);
    // Pontos extras sorteados: o que esta evolução deu fica no card e entra nos status
    const { bonusGanho } = evoluiu.dados;
    assert.ok(Object.values(bonusGanho).every((v) => v >= 0 && v <= 5));
    assert.deepEqual(evoluiu.dados.bonusEvolucao, bonusGanho);
    assert.ok(evoluiu.dados.status.ataque > card.status.ataque);
    assert.deepEqual(evoluiu.dados.evolucoes.map((e) => [e.especieId, e.nivel]), [[6, 36]]);

    const charizard = await evoluir(6);
    assert.equal(charizard.status, 400);
    assert.match(charizard.dados.erro, /nível 36/);
  });

  test('não evolui o Pokémon de outro treinador nem para uma espécie fora da linha', async () => {
    const ash = await criarTreinador('Ash');
    const gary = await criarTreinador('gary');
    const id = await criarPokemon(ash, { especieId: 4, nivel: 50 });

    const alheio = await amb.api('POST', `/pokemons/${id}/evoluir`, { token: gary.token, corpo: { especieId: 5 } });
    assert.equal(alheio.status, 404);
    const foraDaLinha = await amb.api('POST', `/pokemons/${id}/evoluir`, { token: ash.token, corpo: { especieId: 9 } });
    assert.equal(foraDaLinha.status, 400);

    const { rows } = await amb.pool.query('SELECT especie_id FROM pokemons WHERE id = $1', [id]);
    assert.equal(rows[0].especie_id, 4);
  });
});
