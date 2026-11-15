// Pedidos que chegam ao mesmo tempo: cliques duplos e dois treinadores disputando a mesma coisa.
// Em cada caso só um pode passar, nada é pago ou cobrado duas vezes e nenhuma Pokécoin some ou aparece.
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon, criarTime } = require('../helpers/fabricas');
const {
  criarBatalhaEmAndamento, daVez, atacarAlternado, deixarNoUltimoGolpe,
} = require('../helpers/batalha');

/** Status das respostas em ordem crescente, para comparar sem depender de quem chegou primeiro */
const statusDe = (respostas) => respostas.map((r) => r.status).sort();

describe('concorrência', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());
  beforeEach(() => amb.limparDados());

  const totalDePokecoins = async () => (await amb.pool.query('SELECT sum(pokecoins)::int AS total FROM usuarios')).rows[0].total;
  const donoDe = async (pokemonId) => (await amb.pool.query('SELECT dono_id FROM pokemons WHERE id = $1', [pokemonId])).rows[0].dono_id;
  const contar = async (sql, params) => (await amb.pool.query(sql, params)).rows[0].total;

  describe('mercado', () => {
    let ash;
    let gary;
    let misty;

    beforeEach(async () => {
      ash = await criarTreinador('Ash', { pokecoins: 1000 });
      gary = await criarTreinador('gary', { pokecoins: 1000 });
      misty = await criarTreinador('misty', { pokecoins: 1000 });
    });

    const anunciar = async (quem, corpo) => {
      const r = await amb.api('POST', '/anuncios', { token: quem.token, corpo });
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      return r.dados.id;
    };
    const propor = async (quem, anuncioId, corpo) => {
      const r = await amb.api('POST', `/anuncios/${anuncioId}/propostas`, { token: quem.token, corpo });
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      return r.dados.id;
    };
    const comprar = (quem, anuncioId) => amb.api('POST', `/anuncios/${anuncioId}/comprar`, { token: quem.token });
    const aceitar = (quem, propostaId) => amb.api('POST', `/propostas/${propostaId}/aceitar`, { token: quem.token });

    test('dois compradores no mesmo anúncio: só um leva, e o vendedor recebe uma vez', async () => {
      const card = await criarPokemon(ash);
      const anuncio = await anunciar(ash, { pokemonId: card, preco: 50 });

      const respostas = await Promise.all([comprar(gary, anuncio), comprar(misty, anuncio)]);
      assert.deepEqual(statusDe(respostas), [200, 400]);

      const vencedor = respostas[0].status === 200 ? gary : misty;
      assert.equal(await donoDe(card), vencedor.id);
      assert.equal(await amb.saldo(ash.token), 1050);
      assert.equal(await amb.saldo(vencedor.token), 950);
      assert.equal(await totalDePokecoins(), 3000);
    });

    test('compra direta e aceite de proposta ao mesmo tempo: só um fecha', async () => {
      const card = await criarPokemon(ash);
      const anuncio = await anunciar(ash, { pokemonId: card, preco: 50, aceitaPropostas: true });
      const proposta = await propor(misty, anuncio, { pokecoins: 80 });

      const respostas = await Promise.all([comprar(gary, anuncio), aceitar(ash, proposta)]);
      assert.equal(respostas.filter((r) => r.status < 300).length, 1, JSON.stringify(respostas));

      const novoDono = await donoDe(card);
      assert.ok([gary.id, misty.id].includes(novoDono));
      assert.equal(await amb.saldo(ash.token), novoDono === gary.id ? 1050 : 1080);
      assert.equal(await totalDePokecoins(), 3000);
    });

    test('duas propostas aceitas ao mesmo tempo no mesmo anúncio: só uma fecha', async () => {
      const card = await criarPokemon(ash);
      const anuncio = await anunciar(ash, { pokemonId: card, aceitaPropostas: true });
      const deGary = await propor(gary, anuncio, { pokecoins: 30 });
      const deMisty = await propor(misty, anuncio, { pokecoins: 40 });

      const respostas = await Promise.all([aceitar(ash, deGary), aceitar(ash, deMisty)]);
      assert.deepEqual(statusDe(respostas), [204, 400]);
      assert.equal(await contar("SELECT count(*)::int AS total FROM propostas WHERE status = 'aceita'"), 1);
      assert.equal(await totalDePokecoins(), 3000);
    });

    test('o mesmo Pokémon oferecido em duas propostas aceitas ao mesmo tempo vai para um só', async () => {
      const deGary = await anunciar(gary, { pokemonId: await criarPokemon(gary), aceitaPropostas: true });
      const deMisty = await anunciar(misty, { pokemonId: await criarPokemon(misty), aceitaPropostas: true });
      const oferecido = await criarPokemon(ash);
      const paraGary = await propor(ash, deGary, { pokemonIds: [oferecido] });
      const paraMisty = await propor(ash, deMisty, { pokemonIds: [oferecido] });

      const respostas = await Promise.all([aceitar(gary, paraGary), aceitar(misty, paraMisty)]);
      assert.deepEqual(statusDe(respostas), [204, 400]);

      const ganhou = respostas[0].status === 204 ? gary : misty;
      assert.equal(await donoDe(oferecido), ganhou.id);
      // Quem perdeu a corrida continua com o próprio Pokémon anunciado
      assert.equal(await contar(
        "SELECT count(*)::int AS total FROM anuncios WHERE status = 'trocado'",
      ), 1);
    });
  });

  describe('cliques duplos', () => {
    test('pokébolas: compras paralelas não deixam o saldo negativo', async () => {
      const ash = await criarTreinador('Ash', { pokecoins: 250 });
      const comprar = () => amb.api('POST', '/loja/pokebolas', { token: ash.token, corpo: { quantidade: 10 } });

      assert.deepEqual(statusDe(await Promise.all([comprar(), comprar(), comprar()])), [201, 201, 400]);
      const { dados } = await amb.api('GET', '/eu', { token: ash.token });
      assert.deepEqual([dados.usuario.pokecoins, dados.usuario.pokebolas], [50, 20]);
    });

    test('cuidado: dois cliques no carinho registram um só', async () => {
      const ash = await criarTreinador('Ash');
      const id = await criarPokemon(ash);
      const carinho = () => amb.api('POST', `/pokemons/${id}/cuidar`, { token: ash.token, corpo: { tipo: 'carinho' } });

      assert.deepEqual(statusDe(await Promise.all([carinho(), carinho()])), [200, 400]);
      assert.equal(await contar('SELECT count(*)::int AS total FROM cuidados WHERE pokemon_id = $1', [id]), 1);
      assert.equal((await amb.pool.query('SELECT afeto FROM pokemons WHERE id = $1', [id])).rows[0].afeto, 10);
    });

    test('evolução: dois cliques evoluem e sorteiam o bônus uma vez só', async () => {
      const ash = await criarTreinador('Ash');
      const id = await criarPokemon(ash, { especieId: 4, nivel: 16 });
      const evoluir = () => amb.api('POST', `/pokemons/${id}/evoluir`, { token: ash.token, corpo: { especieId: 5 } });

      const respostas = await Promise.all([evoluir(), evoluir()]);
      assert.deepEqual(statusDe(respostas), [200, 400]);
      const { bonusGanho } = respostas.find((r) => r.status === 200).dados;
      const { rows: [card] } = await amb.pool.query(
        'SELECT especie_id, bonus_hp, bonus_ataque, bonus_defesa, bonus_velocidade FROM pokemons WHERE id = $1', [id],
      );
      assert.equal(card.especie_id, 5);
      assert.deepEqual(
        [card.bonus_hp, card.bonus_ataque, card.bonus_defesa, card.bonus_velocidade],
        [bonusGanho.hp, bonusGanho.ataque, bonusGanho.defesa, bonusGanho.velocidade],
      );
    });

    test('golpes: roleta paga e desbloqueio cobram uma vez só', async () => {
      const ash = await criarTreinador('Ash', { pokecoins: 1000 });
      const comAfeto = await criarPokemon(ash, { afeto: 500, golpes: [11, 12] });
      const semAfeto = await criarPokemon(ash);
      const roletar = () => amb.api('POST', `/pokemons/${comAfeto}/golpes/roletar`, { token: ash.token });
      const desbloquear = () => amb.api('POST', `/pokemons/${semAfeto}/golpes/desbloquear`, { token: ash.token });

      assert.deepEqual(statusDe(await Promise.all([roletar(), roletar()])), [200, 400]);
      assert.deepEqual(statusDe(await Promise.all([desbloquear(), desbloquear()])), [200, 400]);
      assert.equal(await amb.saldo(ash.token), 1000 - 100 - 200);
      assert.equal(await contar(
        "SELECT count(*)::int AS total FROM transacoes_pokecoins WHERE motivo IN ('roleta_golpes', 'desbloqueio_golpes')",
      ), 2);
    });

    test('história: explorar e refazer duas vezes não criam dois encontros nem cobram duas vezes', async () => {
      const ash = await criarTreinador('Ash', { pokecoins: 100 });
      await criarTime(ash, { nivel: 60 });
      const explorar = () => amb.api('POST', '/historia/explorar', { token: ash.token });

      const [a, b] = await Promise.all([explorar(), explorar()]);
      assert.equal(a.dados.id, b.dados.id);
      assert.equal(await contar('SELECT count(*)::int AS total FROM historia_encontros'), 1);

      // Vence o ponto e libera para refazer
      await amb.pool.query("UPDATE historia_encontros SET status = 'fugiu', vencido_em = now() WHERE id = $1", [a.dados.id]);
      const refazer = () => amb.api('POST', '/historia/trilhas/1/pontos/1/refazer', { token: ash.token });
      const [r1, r2] = await Promise.all([refazer(), refazer()]);
      assert.deepEqual([r1.status, r2.status], [200, 200]);
      assert.equal(r1.dados.encontro.id, r2.dados.encontro.id);
      assert.equal(await amb.saldo(ash.token), 75);
    });

    test('história: duas pokébolas na última tentativa gastam só uma', async () => {
      const ash = await criarTreinador('Ash', { pokebolas: 5 });
      await criarTime(ash, { nivel: 60 });
      const encontro = (await amb.api('POST', '/historia/explorar', { token: ash.token })).dados;
      await amb.pool.query(
        "UPDATE historia_encontros SET status = 'vencido', vencido_em = now(), tentativas_captura = 9 WHERE id = $1",
        [encontro.id],
      );
      const capturar = () => amb.api('POST', `/historia/encontros/${encontro.id}/capturar`, { token: ash.token });

      assert.deepEqual(statusDe(await Promise.all([capturar(), capturar()])), [200, 400]);
      assert.equal((await amb.api('GET', '/eu', { token: ash.token })).dados.usuario.pokebolas, 4);
      assert.ok(await contar("SELECT count(*)::int AS total FROM pokemons WHERE origem = 'captura'") <= 1);
    });
  });

  describe('batalhas', () => {
    let ash;
    let gary;

    beforeEach(async () => {
      ash = await criarTreinador('Ash', { pokecoins: 0 });
      gary = await criarTreinador('gary', { pokecoins: 0 });
      await criarTime(ash);
      await criarTime(gary);
    });

    test('desafio e aceite com clique duplo valem uma vez', async () => {
      const desafiar = () => amb.api('POST', '/batalhas', { token: ash.token, corpo: { oponente: 'gary' } });
      const desafios = await Promise.all([desafiar(), desafiar()]);
      assert.deepEqual(statusDe(desafios), [201, 400]);

      const id = desafios.find((r) => r.status === 201).dados.id;
      const aceitar = () => amb.api('POST', `/batalhas/${id}/responder`, { token: gary.token, corpo: { aceitar: true } });
      assert.deepEqual(statusDe(await Promise.all([aceitar(), aceitar()])), [200, 400]);
      assert.equal(await contar('SELECT count(*)::int AS total FROM batalhas'), 1);
    });

    test('a mesma jogada enviada duas vezes conta uma vez', async () => {
      const id = await criarBatalhaEmAndamento(amb, ash, gary);
      const quem = await daVez(amb, id, [ash, gary]);
      const atacar = () => amb.api('POST', `/batalhas/${id}/jogadas`, { token: quem.token, corpo: { tipo: 'atacar' } });

      assert.deepEqual(statusDe(await Promise.all([atacar(), atacar()])), [200, 400]);
      assert.equal(await contar('SELECT count(*)::int AS total FROM batalha_acoes WHERE batalha_id = $1', [id]), 1);
    });

    test('golpe final com clique duplo paga a recompensa uma vez só', async () => {
      const id = await criarBatalhaEmAndamento(amb, ash, gary);
      await atacarAlternado(amb, id, [ash, gary], 6);
      const finalizador = await deixarNoUltimoGolpe(amb, id, [ash, gary]);
      const atacar = () => amb.api('POST', `/batalhas/${id}/jogadas`, { token: finalizador.token, corpo: { tipo: 'atacar' } });

      assert.deepEqual(statusDe(await Promise.all([atacar(), atacar()])), [200, 400]);
      assert.equal(await contar(
        "SELECT count(*)::int AS total FROM transacoes_pokecoins WHERE motivo = 'recompensa_batalha'",
      ), 2, 'uma para o vencedor e uma para o perdedor');
      assert.equal(await amb.saldo(finalizador.token), 40);
    });

    test('prazo vencido: agendador e jogada ao mesmo tempo registram um único timeout', async () => {
      const agendador = require('../../src/jogo/agendador');
      const id = await criarBatalhaEmAndamento(amb, ash, gary);
      const atrasado = await daVez(amb, id, [ash, gary]);
      await amb.pool.query("UPDATE batalhas SET prazo_em = now() - interval '1 minute' WHERE id = $1", [id]);

      const [, jogada] = await Promise.all([
        agendador.rodarUmaVez(),
        amb.api('POST', `/batalhas/${id}/jogadas`, { token: atrasado.token, corpo: { tipo: 'atacar' } }),
      ]);
      assert.equal(jogada.status, 400, 'o prazo já tinha vencido: a vez passou');
      assert.equal(await contar(
        "SELECT count(*)::int AS total FROM batalha_acoes WHERE batalha_id = $1 AND tipo = 'passar'", [id],
      ), 1);
      assert.notEqual((await daVez(amb, id, [ash, gary])).id, atrasado.id);
    });
  });
});
