// Desafios e batalhas entre treinadores: validações, jogo até o fim, prazos, W.O. e anti-farm
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarTime } = require('../helpers/fabricas');

describe('batalhas', { skip: semBanco }, () => {
  let amb;
  let agendador;
  let ash;
  let gary;

  before(async () => {
    amb = await prepararAmbiente();
    agendador = require('../../src/jogo/agendador');
  });
  after(() => amb?.encerrar());

  // Dois treinadores com time completo no nível 1 e saldo zerado (para conferir as recompensas exatas)
  beforeEach(async () => {
    await amb.limparDados();
    ash = await criarTreinador('Ash', { pokecoins: 0 });
    gary = await criarTreinador('gary', { pokecoins: 0 });
    await criarTime(ash);
    await criarTime(gary);
  });

  const desafiar = (de, oponente) => amb.api('POST', '/batalhas', { token: de.token, corpo: { oponente } });
  const responder = (quem, id, aceitar) => amb.api('POST', `/batalhas/${id}/responder`, { token: quem.token, corpo: { aceitar } });
  const jogar = (quem, id, corpo) => amb.api('POST', `/batalhas/${id}/jogadas`, { token: quem.token, corpo });
  const abrir = async (quem, id) => (await amb.api('GET', `/batalhas/${id}`, { token: quem.token })).dados;

  /** Ash desafia, Gary aceita. Devolve a batalha vista pelo Gary. */
  async function criarBatalhaAceita() {
    const desafio = await desafiar(ash, 'gary');
    assert.equal(desafio.status, 201, JSON.stringify(desafio.dados));
    const aceita = await responder(gary, desafio.dados.id, true);
    assert.equal(aceita.status, 200, JSON.stringify(aceita.dados));
    return aceita.dados;
  }

  /** Os dois atacam até a batalha acabar. Devolve a batalha vista pelo Ash. */
  async function jogarAteOFim(id) {
    for (let i = 0; i < 1000; i += 1) {
      const { batalha } = await abrir(ash, id);
      if (batalha.status === 'finalizada') return batalha;
      const r = await jogar(batalha.minhaVez ? ash : gary, id, { tipo: 'atacar' });
      assert.equal(r.status, 200, JSON.stringify(r.dados));
    }
    throw new Error('A batalha não acabou');
  }

  /** Faz o prazo da jogada atual vencer e roda o agendador */
  async function estourarPrazo(id) {
    await amb.pool.query("UPDATE batalhas SET prazo_em = now() - interval '1 minute' WHERE id = $1", [id]);
    await agendador.rodarUmaVez();
  }

  describe('desafio', () => {
    test('não desafia a si mesmo, quem não existe, nem duas vezes a mesma pessoa', async () => {
      assert.equal((await desafiar(ash, 'ash')).status, 400);
      assert.equal((await desafiar(ash, 'ninguem')).status, 400);
      const desafio = await desafiar(ash, 'GARY');
      assert.equal(desafio.status, 201);
      assert.equal(desafio.dados.oponenteOnline, true);
      assert.equal(desafio.dados.status, 'aguardando');
      assert.equal((await desafiar(ash, 'gary')).status, 400);
    });

    test('precisa de time completo para desafiar', async () => {
      const misty = await criarTreinador('misty');
      const r = await desafiar(misty, 'gary');
      assert.equal(r.status, 400);
      assert.match(r.dados.erro, /Monte um time/);
    });

    test('o pendente aparece para os dois lados e só o desafiado responde', async () => {
      const desafio = await desafiar(ash, 'gary');
      const doAsh = (await amb.api('GET', '/treinadores/ativos', { token: ash.token })).dados;
      assert.equal(doAsh.find((d) => d.login === 'gary').desafioEnviado, true);
      const doGary = (await amb.api('GET', '/treinadores/ativos', { token: gary.token })).dados;
      assert.equal(doGary.find((d) => d.login === 'Ash').desafioRecebido, true);

      assert.equal((await responder(ash, desafio.dados.id, true)).status, 400);
    });

    test('desafio não respondido em 24h expira e não pode mais ser aceito', async () => {
      const desafio = await desafiar(ash, 'gary');
      await amb.pool.query("UPDATE batalhas SET expira_em = now() - interval '1 minute' WHERE id = $1", [desafio.dados.id]);
      const r = await responder(gary, desafio.dados.id, true);
      assert.equal(r.status, 400);
      assert.match(r.dados.erro, /expirou/);
    });
  });

  test('batalha completa por nocaute: Pokécoins e XP para os dois lados', async () => {
    const aceita = await criarBatalhaAceita();
    assert.equal(aceita.status, 'em_andamento');
    assert.ok(new Date(aceita.prazoEm) > new Date());

    // Fora da vez não joga
    assert.equal((await jogar(aceita.minhaVez ? ash : gary, aceita.id, { tipo: 'atacar' })).status, 400);

    const fim = await jogarAteOFim(aceita.id);
    assert.equal(fim.motivoFim, 'nocaute');

    const [vencedor, perdedor] = fim.venci ? [ash, gary] : [gary, ash];
    assert.equal(await amb.saldo(vencedor.token), 40);
    assert.equal(await amb.saldo(perdedor.token), 10);

    // XP: 150 no nível 1 (precisa de 100) -> nível 2 com 50; 50 no nível 1 -> continua no 1 com 50
    const cardsVencedor = (await amb.api('GET', '/eu', { token: vencedor.token })).dados.pokemons;
    assert.ok(cardsVencedor.every((p) => p.nivel === 2 && p.xp === 50));
    const cardsPerdedor = (await amb.api('GET', '/eu', { token: perdedor.token })).dados.pokemons;
    assert.ok(cardsPerdedor.every((p) => p.nivel === 1 && p.xp === 50));

    const { batalha, acoes } = await abrir(vencedor, aceita.id);
    assert.equal(batalha.minhasRecompensas.pokecoins, 40);
    assert.equal(batalha.minhasRecompensas.subiram.length, 3);
    assert.ok(acoes.length >= 6);

    // Batalha acabada não aceita jogada
    assert.equal((await jogar(vencedor, aceita.id, { tipo: 'atacar' })).status, 400);
  });

  test('desistir encerra na hora, até fora da vez, sem recompensa', async () => {
    const aceita = await criarBatalhaAceita();
    const foraDaVez = aceita.minhaVez ? ash : gary;
    assert.equal((await jogar(foraDaVez, aceita.id, { tipo: 'desistir' })).status, 200);

    const { batalha } = await abrir(foraDaVez, aceita.id);
    assert.equal(batalha.status, 'finalizada');
    assert.equal(batalha.motivoFim, 'desistencia');
    assert.equal(batalha.venci, false);
    assert.deepEqual([await amb.saldo(ash.token), await amb.saldo(gary.token)], [0, 0]);
  });

  describe('prazo de jogada', () => {
    test('pelo agendador: 2 timeouts seguidos do mesmo jogador dão W.O., sem recompensa', async () => {
      const batalha = await criarBatalhaAceita();
      const vezDoAshAntes = !batalha.minhaVez; // a batalha veio da visão do Gary

      await estourarPrazo(batalha.id); // 1º timeout de quem começou: a vez passa
      let dados = await abrir(ash, batalha.id);
      assert.equal(dados.batalha.status, 'em_andamento');
      assert.equal(dados.batalha.minhaVez, !vezDoAshAntes);
      assert.equal(dados.acoes[0].automatica, true);

      // O outro joga de verdade, e quem começou perde o prazo de novo
      await jogar(dados.batalha.minhaVez ? ash : gary, batalha.id, { tipo: 'atacar' });
      await estourarPrazo(batalha.id);

      dados = await abrir(ash, batalha.id);
      assert.equal(dados.batalha.status, 'finalizada');
      assert.equal(dados.batalha.motivoFim, 'wo');
      assert.match(dados.batalha.minhasRecompensas.semRecompensa, /abandona|cedo demais/);
      assert.deepEqual([await amb.saldo(ash.token), await amb.saldo(gary.token)], [0, 0]);
    });

    test('abrir a batalha já resolve um prazo vencido, mesmo sem o agendador', async () => {
      const batalha = await criarBatalhaAceita();
      await amb.pool.query("UPDATE batalhas SET prazo_em = now() - interval '1 minute' WHERE id = $1", [batalha.id]);
      const { acoes } = await abrir(ash, batalha.id);
      assert.equal(acoes.length, 1);
      assert.equal(acoes[0].tipo, 'passar');
      assert.equal(acoes[0].automatica, true);
    });
  });

  test('anti-farm: no máximo 3 batalhas premiadas contra o mesmo treinador em 24h', async () => {
    for (let i = 0; i < 3; i += 1) {
      const fim = await jogarAteOFim((await criarBatalhaAceita()).id);
      assert.equal(fim.minhasRecompensas.semRecompensa, null, `batalha ${i + 1} deveria ser premiada`);
    }
    const quarta = await jogarAteOFim((await criarBatalhaAceita()).id);
    assert.equal(quarta.minhasRecompensas.pokecoins, 0);
    assert.match(quarta.minhasRecompensas.semRecompensa, /mesmo treinador/);
  });

  test('lista de batalhas traz pendentes e encerradas, com o login do oponente', async () => {
    const encerrada = await criarBatalhaAceita();
    await jogar(gary, encerrada.id, { tipo: 'desistir' });
    const pendente = await desafiar(ash, 'gary');

    const { dados } = await amb.api('GET', '/batalhas', { token: gary.token });
    assert.deepEqual(dados.map((b) => b.id), [pendente.dados.id, encerrada.id]);
    assert.ok(dados.every((b) => b.oponente === 'Ash'));
  });
});
