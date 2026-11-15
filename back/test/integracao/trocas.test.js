// Mercado de trocas: anúncios, compra direta e propostas
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon, criarTime } = require('../helpers/fabricas');

describe('trocas', { skip: semBanco }, () => {
  let amb;
  let ash;
  let gary;
  let timeDoAsh;
  let a1;
  let a2;
  let g1;
  let g2;

  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());

  // Cada um com 1000 Pokécoins, time completo e 2 Pokémon fora do time para trocar
  beforeEach(async () => {
    await amb.limparDados();
    ash = await criarTreinador('Ash', { pokecoins: 1000 });
    gary = await criarTreinador('gary', { pokecoins: 1000 });
    timeDoAsh = await criarTime(ash);
    await criarTime(gary);
    a1 = await criarPokemon(ash, { especieId: 152, afeto: 50 });
    a2 = await criarPokemon(ash, { especieId: 155 });
    g1 = await criarPokemon(gary, { especieId: 158 });
    g2 = await criarPokemon(gary, { especieId: 161 });
  });

  const anunciar = (quem, corpo) => amb.api('POST', '/anuncios', { token: quem.token, corpo });
  const comprar = (quem, anuncioId) => amb.api('POST', `/anuncios/${anuncioId}/comprar`, { token: quem.token });
  const propor = (quem, anuncioId, corpo) => amb.api('POST', `/anuncios/${anuncioId}/propostas`, { token: quem.token, corpo });
  const colecao = async (quem) => (await amb.api('GET', '/eu', { token: quem.token })).dados.pokemons.map((p) => p.id);

  test('anúncio: recusa Pokémon do time, sem preço nem propostas, alheio ou já anunciado', async () => {
    assert.equal((await anunciar(ash, { pokemonId: timeDoAsh[0], preco: 10 })).status, 400);
    assert.equal((await anunciar(ash, { pokemonId: a1 })).status, 400);
    assert.equal((await anunciar(ash, { pokemonId: g1, preco: 10 })).status, 400);
    const anuncio = await anunciar(ash, { pokemonId: a1, preco: 50, aceitaPropostas: true });
    assert.equal(anuncio.status, 201, JSON.stringify(anuncio.dados));
    assert.equal((await anunciar(ash, { pokemonId: a1, preco: 60 })).status, 400);

    // Anunciado não entra no time
    const time = await amb.api('PUT', '/time', { token: ash.token, corpo: { pokemonIds: [...timeDoAsh.slice(1), a1] } });
    assert.equal(time.status, 400);
    assert.match(time.dados.erro, /anunciado/);
  });

  test('mercado agrupa por espécie e mostra o anúncio com o login de quem vende', async () => {
    const anuncio = (await anunciar(ash, { pokemonId: a1, preco: 50 })).dados;
    const { especieId } = anuncio.pokemon;

    const mercado = (await amb.api('GET', '/mercado', { token: gary.token })).dados;
    assert.equal(mercado.find((m) => m.especieId === especieId).anuncios, 1);

    const lista = (await amb.api('GET', `/mercado/${especieId}`, { token: gary.token })).dados;
    const doAsh = lista.find((a) => a.id === anuncio.id);
    assert.equal(doAsh.vendedor, 'Ash');
    assert.equal(doAsh.meu, false);
    assert.equal(doAsh.preco, 50);
  });

  test('compra direta transfere o card (zerando o afeto) e as Pokécoins', async () => {
    const anuncio = (await anunciar(ash, { pokemonId: a1, preco: 50 })).dados;

    assert.equal((await comprar(ash, anuncio.id)).status, 400, 'não compra o próprio anúncio');
    const compra = await comprar(gary, anuncio.id);
    assert.equal(compra.status, 200, JSON.stringify(compra.dados));
    assert.equal(compra.dados.id, a1);
    assert.equal(compra.dados.afeto.pontos, 0);
    assert.equal(await amb.saldo(ash.token), 1050);
    assert.equal(await amb.saldo(gary.token), 950);
    assert.ok((await colecao(gary)).includes(a1));
    assert.ok(!(await colecao(ash)).includes(a1));
    assert.equal((await comprar(gary, anuncio.id)).status, 400, 'anúncio vendido não é comprado de novo');
  });

  test('proposta com Pokémon + Pokécoins: só o vendedor aceita, e tudo troca de dono', async () => {
    const deGary = (await anunciar(gary, { pokemonId: g1, aceitaPropostas: true })).dados;
    assert.equal((await comprar(ash, deGary.id)).status, 400, 'anúncio só para propostas não tem compra direta');

    const proposta = await propor(ash, deGary.id, { pokemonIds: [a2], pokecoins: 10 });
    assert.equal(proposta.status, 201, JSON.stringify(proposta.dados));
    assert.equal((await propor(ash, deGary.id, { pokemonIds: [g2] })).status, 400, 'não oferece Pokémon alheio');

    const { recebidas } = (await amb.api('GET', '/propostas', { token: gary.token })).dados;
    assert.equal(recebidas[0].alvo.id, g1);
    assert.deepEqual(recebidas[0].oferta.map((p) => p.id), [a2]);
    assert.equal(recebidas[0].pokecoins, 10);
    assert.equal(recebidas[0].proponente, 'Ash');

    assert.equal((await amb.api('POST', `/propostas/${proposta.dados.id}/aceitar`, { token: ash.token })).status, 400);
    assert.equal((await amb.api('POST', `/propostas/${proposta.dados.id}/aceitar`, { token: gary.token })).status, 204);
    assert.ok((await colecao(ash)).includes(g1));
    assert.ok((await colecao(gary)).includes(a2));
    assert.deepEqual([await amb.saldo(ash.token), await amb.saldo(gary.token)], [990, 1010]);
    assert.equal((await amb.api('GET', '/propostas', { token: ash.token })).dados.enviadas[0].status, 'aceita');
  });

  test('o mesmo proponente não manda duas propostas pendentes para o mesmo anúncio', async () => {
    const deGary = (await anunciar(gary, { pokemonId: g1, aceitaPropostas: true })).dados;
    assert.equal((await propor(ash, deGary.id, { pokemonIds: [a2], pokecoins: 10 })).status, 201);
    assert.equal((await propor(ash, deGary.id, { pokecoins: 5 })).status, 400);
  });

  test('proposta recusada não move nada, e o anúncio pode ser removido', async () => {
    const outro = (await anunciar(gary, { pokemonId: g2, aceitaPropostas: true })).dados;
    const pedido = (await propor(ash, outro.id, { pokecoins: 5 })).dados;

    assert.equal((await amb.api('POST', `/propostas/${pedido.id}/recusar`, { token: gary.token })).status, 204);
    assert.equal((await amb.api('GET', '/propostas', { token: ash.token })).dados.enviadas[0].status, 'recusada');
    assert.deepEqual([await amb.saldo(ash.token), await amb.saldo(gary.token)], [1000, 1000]);

    assert.equal((await amb.api('DELETE', `/anuncios/${outro.id}`, { token: gary.token })).status, 204);
    assert.equal((await amb.api('GET', '/anuncios/meus', { token: gary.token })).dados.length, 0);
  });
});
