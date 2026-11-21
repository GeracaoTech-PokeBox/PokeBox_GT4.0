// Notificações: avisos por aba, agrupamento, recompensa ao ver e o limite do dia
const {
  describe, test, before, after, beforeEach,
} = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarTime } = require('../helpers/fabricas');

describe('notificações', { skip: semBanco }, () => {
  let amb;
  let ash;
  let gary;

  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());

  beforeEach(async () => {
    await amb.limparDados();
    ash = await criarTreinador('ash', { pokecoins: 100 });
    gary = await criarTreinador('gary', { pokecoins: 100 });
  });

  const listar = (quem) => amb.api('GET', '/notificacoes', { token: quem.token });
  const ver = (quem, id) => amb.api('POST', `/notificacoes/${id}/ver`, { token: quem.token });

  test('visitas na vitrine viram uma notificação só, com a quantidade somando', async () => {
    await amb.api('GET', '/vitrines/ash', { token: gary.token });
    await amb.api('GET', '/vitrines/ash', { token: gary.token });
    await amb.api('GET', '/vitrines/ash', { token: ash.token }); // o próprio dono não conta

    const { dados } = await listar(ash);
    assert.equal(dados.notificacoes.length, 1);
    assert.equal(dados.notificacoes[0].aba, 'vitrine');
    assert.equal(dados.notificacoes[0].quantidade, 2);
    assert.deepEqual(dados.porAba, { vitrine: 1 });
    assert.equal(dados.recompensa, 5);
    assert.equal((await listar(gary)).dados.notificacoes.length, 0);
  });

  test('ver dá 5 Pokécoins uma vez só; a notificação de outro treinador não aparece', async () => {
    await amb.api('GET', '/vitrines/ash', { token: gary.token });
    const [notificacao] = (await listar(ash)).dados.notificacoes;

    assert.equal((await ver(gary, notificacao.id)).status, 404, 'não é dele');
    const vista = await ver(ash, notificacao.id);
    assert.equal(vista.status, 200, JSON.stringify(vista.dados));
    assert.equal(vista.dados.pokecoins, 5);
    assert.equal(vista.dados.saldo, 105);
    assert.equal(await amb.saldo(ash.token), 105);
    assert.equal((await ver(ash, notificacao.id)).status, 404, 'já vista');
    assert.equal((await listar(ash)).dados.notificacoes.length, 0);

    // Depois de vista, uma visita nova cria outra notificação
    await amb.api('GET', '/vitrines/ash', { token: gary.token });
    assert.equal((await listar(ash)).dados.notificacoes[0].quantidade, 1);
  });

  test('a recompensa tem limite de 15 por dia; passando dele, ver ainda marca como vista', async () => {
    const { notificar } = require('../../src/features/notificacoes');
    for (let i = 0; i < 17; i += 1) {
      await notificar(amb.pool, {
        usuarioId: ash.id, aba: 'loja', chave: `teste:${i}`, titulo: 'Teste', texto: 'Teste',
      });
    }
    const { dados } = await listar(ash);
    assert.equal(dados.porAba.loja, 17);
    assert.equal(dados.recompensasRestantesHoje, 15);

    const ganhos = [];
    for (const n of dados.notificacoes) ganhos.push((await ver(ash, n.id)).dados.pokecoins);
    assert.deepEqual(ganhos, [...Array(15).fill(5), 0, 0]);
    assert.equal(await amb.saldo(ash.token), 175);
    assert.equal((await listar(ash)).dados.recompensasRestantesHoje, 0);
  });

  test('desafio avisa o desafiado na aba Batalhas', async () => {
    await criarTime(ash);
    const desafio = await amb.api('POST', '/batalhas', { token: ash.token, corpo: { oponente: 'gary' } });
    assert.equal(desafio.status, 201, JSON.stringify(desafio.dados));

    const { dados } = await listar(gary);
    assert.equal(dados.porAba.batalhas, 1);
    assert.match(dados.notificacoes[0].texto, /ash desafiou você/);
  });
});
