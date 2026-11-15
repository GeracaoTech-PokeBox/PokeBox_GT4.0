// Teste de fumaça: o caminho de um jogador novo do cadastro até a primeira batalha,
// tudo pela API, sem mexer no banco. Os detalhes de cada parte ficam nos outros arquivos.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');

describe('jornada de dois jogadores novos', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());

  test('cadastro, inicial, loja, time, desafio e batalha até o fim', async () => {
    const { api, saldo } = amb;
    const jogadores = {};
    for (const [login, celular, especieId] of [['Ash', '11999999999', 4], ['gary', '11888888888', 7]]) {
      const cadastro = await api('POST', '/auth/cadastro', { corpo: { login, celular, senha: 'senha12345' } });
      assert.equal(cadastro.status, 201);
      const { token } = cadastro.dados;
      assert.equal((await api('POST', '/eu/inicial', { token, corpo: { especieId } })).status, 201);
      for (let i = 0; i < 2; i += 1) {
        assert.equal((await api('POST', '/loja/comprar', { token, corpo: { geracao: 1 } })).status, 201);
      }
      jogadores[login] = { token };
    }
    const { Ash: ash, gary } = jogadores;

    // Time completo com o inicial + 2 da loja; reordenar continua valendo
    const ids = (await api('GET', '/eu', { token: ash.token })).dados.pokemons.map((p) => p.id);
    assert.equal(ids.length, 3);
    assert.equal((await api('PUT', '/time', { token: ash.token, corpo: { pokemonIds: ids.reverse() } })).status, 204);

    // Gary vê Ash online e o desafia
    const ativos = (await api('GET', '/treinadores/ativos', { token: gary.token })).dados;
    assert.deepEqual(ativos.map((a) => a.login), ['Ash']);
    const desafio = await api('POST', '/batalhas', { token: gary.token, corpo: { oponente: 'Ash' } });
    assert.equal(desafio.status, 201);
    const aceita = await api('POST', `/batalhas/${desafio.dados.id}/responder`, { token: ash.token, corpo: { aceitar: true } });
    assert.equal(aceita.status, 200);

    let batalha;
    for (let i = 0; i < 1000; i += 1) {
      ({ batalha } = (await api('GET', `/batalhas/${desafio.dados.id}`, { token: ash.token })).dados);
      if (batalha.status === 'finalizada') break;
      const token = batalha.minhaVez ? ash.token : gary.token;
      assert.equal((await api('POST', `/batalhas/${desafio.dados.id}/jogadas`, { token, corpo: { tipo: 'atacar' } })).status, 200);
    }
    assert.equal(batalha.status, 'finalizada');
    assert.equal(batalha.motivoFim, 'nocaute');

    // 1000 do cadastro - 200 da loja + recompensa (40 para quem venceu, 10 para quem perdeu)
    const [vencedor, perdedor] = batalha.venci ? [ash, gary] : [gary, ash];
    assert.equal(await saldo(vencedor.token), 840);
    assert.equal(await saldo(perdedor.token), 810);
  });
});
