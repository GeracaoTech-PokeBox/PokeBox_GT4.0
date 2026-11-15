// Se uma operação falha no meio, nada do que ela já tinha feito pode ficar gravado.
// A falha é um trigger do Postgres (helpers/falhas.js) que dá erro num ponto escolhido:
// o código do jogo roda como em produção até ali, e o teste confere que o banco voltou ao estado de antes.
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon, criarTime } = require('../helpers/fabricas');
const { injetarFalha } = require('../helpers/falhas');
const { criarBatalhaEmAndamento, atacarAlternado, deixarNoUltimoGolpe } = require('../helpers/batalha');

describe('atomicidade', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());
  beforeEach(() => amb.limparDados());

  /** Injeta a falha só durante este teste. O erro 500 é esperado, então o log dele é silenciado. */
  async function falharDurante(t, alvo) {
    t.mock.method(console, 'error', () => {});
    const remover = await injetarFalha(amb.pool, alvo);
    t.after(remover);
    return remover;
  }

  test('cadastro: se o extrato falha, a conta não é criada', async (t) => {
    const antes = await amb.fotografar();
    await falharDurante(t, { tabela: 'transacoes_pokecoins' });
    const r = await amb.api('POST', '/auth/cadastro', { corpo: { login: 'Ash', celular: '11999999999', senha: 'pikachu123' } });
    assert.equal(r.status, 500);
    assert.deepEqual(await amb.fotografar(), antes, 'nenhuma linha pode ter ficado');
  });

  test('loja: se o card não é criado, o débito e o extrato são desfeitos', async (t) => {
    const ash = await criarTreinador('Ash', { pokecoins: 1000 });
    const antes = await amb.fotografar();
    await falharDurante(t, { tabela: 'pokemons' });

    const r = await amb.api('POST', '/loja/comprar', { token: ash.token, corpo: { geracao: 1 } });
    assert.equal(r.status, 500);
    assert.equal(r.dados.erro, 'Erro interno. Tente novamente.');
    assert.deepEqual(await amb.fotografar(), antes);
  });

  test('compra no mercado: se falha no fim, Pokécoins, card e anúncio voltam como estavam', async (t) => {
    const ash = await criarTreinador('Ash', { pokecoins: 1000 });
    const gary = await criarTreinador('gary', { pokecoins: 1000 });
    const card = await criarPokemon(ash, { afeto: 50 });
    const anuncio = (await amb.api('POST', '/anuncios', { token: ash.token, corpo: { pokemonId: card, preco: 50 } })).dados.id;
    const antes = await amb.fotografar();

    // Último passo da compra: encerrar as propostas pendentes dos cards que mudaram de dono
    const remover = await falharDurante(t, { tabela: 'propostas', evento: 'UPDATE', nivel: 'STATEMENT' });
    assert.equal((await amb.api('POST', `/anuncios/${anuncio}/comprar`, { token: gary.token })).status, 500);
    assert.deepEqual(await amb.fotografar(), antes);

    // Sem a falha, a mesma compra passa
    await remover();
    assert.equal((await amb.api('POST', `/anuncios/${anuncio}/comprar`, { token: gary.token })).status, 200);
  });

  test('troca por proposta: se a oferta não chega ao vendedor, o card anunciado também não sai', async (t) => {
    const ash = await criarTreinador('Ash', { pokecoins: 1000 });
    const gary = await criarTreinador('gary', { pokecoins: 1000 });
    const anunciado = await criarPokemon(ash);
    const oferecido = await criarPokemon(gary);
    const anuncio = (await amb.api('POST', '/anuncios', {
      token: ash.token, corpo: { pokemonId: anunciado, aceitaPropostas: true },
    })).dados.id;
    const proposta = (await amb.api('POST', `/anuncios/${anuncio}/propostas`, {
      token: gary.token, corpo: { pokemonIds: [oferecido], pokecoins: 30 },
    })).dados.id;
    const antes = await amb.fotografar();

    // O card anunciado já foi para o Gary e as Pokécoins já andaram quando a oferta tenta ir para o Ash
    await falharDurante(t, {
      tabela: 'pokemons', evento: 'UPDATE', quando: `OLD.dono_id = ${gary.id} AND NEW.dono_id = ${ash.id}`,
    });
    assert.equal((await amb.api('POST', `/propostas/${proposta}/aceitar`, { token: ash.token })).status, 500);
    assert.deepEqual(await amb.fotografar(), antes);
  });

  test('batalha: se a recompensa falha, o golpe final é desfeito e a batalha continua', async (t) => {
    const ash = await criarTreinador('Ash', { pokecoins: 0 });
    const gary = await criarTreinador('gary', { pokecoins: 0 });
    await criarTime(ash);
    await criarTime(gary);
    const id = await criarBatalhaEmAndamento(amb, ash, gary);
    await atacarAlternado(amb, id, [ash, gary], 6);
    const finalizador = await deixarNoUltimoGolpe(amb, id, [ash, gary]);
    const antes = await amb.fotografar();
    const atacar = () => amb.api('POST', `/batalhas/${id}/jogadas`, { token: finalizador.token, corpo: { tipo: 'atacar' } });

    const remover = await falharDurante(t, { tabela: 'transacoes_pokecoins', quando: "NEW.motivo = 'recompensa_batalha'" });
    assert.equal((await atacar()).status, 500);
    assert.deepEqual(await amb.fotografar(), antes, 'nem a jogada, nem o fim, nem o XP podem ficar gravados');

    // Sem a falha, o mesmo golpe encerra a batalha e paga uma vez
    await remover();
    const fim = await atacar();
    assert.equal(fim.status, 200);
    assert.equal(fim.dados.status, 'finalizada');
    assert.equal(await amb.saldo(finalizador.token), 40);
  });

  test('história: se o encontro da revanche não é criado, as 25 Pokécoins voltam', async (t) => {
    const ash = await criarTreinador('Ash', { pokecoins: 100 });
    await criarTime(ash, { nivel: 60 });
    const encontro = (await amb.api('POST', '/historia/explorar', { token: ash.token })).dados;
    await amb.pool.query("UPDATE historia_encontros SET status = 'fugiu', vencido_em = now() WHERE id = $1", [encontro.id]);
    const antes = await amb.fotografar();

    await falharDurante(t, { tabela: 'historia_encontros' });
    assert.equal((await amb.api('POST', '/historia/trilhas/1/pontos/1/refazer', { token: ash.token })).status, 500);
    assert.deepEqual(await amb.fotografar(), antes);
  });
});
