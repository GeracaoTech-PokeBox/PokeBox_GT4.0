// Um treinador tentando mexer no que é de outro, rota por rota.
// Cada tentativa precisa ser recusada e deixar o banco exatamente como estava.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarPokemon, criarTime } = require('../helpers/fabricas');
const { criarBatalhaEmAndamento } = require('../helpers/batalha');

describe('autorização: o Gary tenta agir no que é do Ash e da Misty', { skip: semBanco }, () => {
  let amb;
  /** Ids do cenário, preenchidos no before */
  const c = {};

  before(async () => {
    amb = await prepararAmbiente();
    const ash = await criarTreinador('Ash', { pokecoins: 1000, pokebolas: 5 });
    const misty = await criarTreinador('misty', { pokecoins: 1000 });
    c.gary = await criarTreinador('gary', { pokecoins: 1000, pokebolas: 5 });
    await criarTime(c.gary);

    // Pokémon do Ash: o time, um Charmander pronto para evoluir e roletar, e um anunciado
    c.timeDoAsh = await criarTime(ash, { nivel: 60 });
    c.charmander = await criarPokemon(ash, { especieId: 4, nivel: 16, afeto: 500 });
    await amb.api('POST', `/pokemons/${c.charmander}/cuidar`, { token: ash.token, corpo: { tipo: 'carinho' } });
    const anunciado = await criarPokemon(ash);
    c.anuncioDoAsh = (await amb.api('POST', '/anuncios', {
      token: ash.token, corpo: { pokemonId: anunciado, preco: 50, aceitaPropostas: true },
    })).dados.id;

    // A Misty anuncia, e o Ash manda uma proposta para ela
    await criarTime(misty);
    c.anuncioDaMisty = (await amb.api('POST', '/anuncios', {
      token: misty.token, corpo: { pokemonId: await criarPokemon(misty), aceitaPropostas: true },
    })).dados.id;
    c.propostaDoAsh = (await amb.api('POST', `/anuncios/${c.anuncioDaMisty}/propostas`, {
      token: ash.token, corpo: { pokecoins: 10 },
    })).dados.id;

    // Uma batalha Ash x Misty em andamento e um desafio da Misty esperando o Ash
    c.batalha = await criarBatalhaEmAndamento(amb, ash, misty);
    c.desafio = (await amb.api('POST', '/batalhas', { token: misty.token, corpo: { oponente: 'Ash' } })).dados.id;

    // História do Ash: ponto 1 vencido (dá para capturar) e ponto 2 em batalha
    const ponto1 = (await amb.api('POST', '/historia/explorar', { token: ash.token })).dados;
    await amb.pool.query("UPDATE historia_encontros SET status = 'vencido', vencido_em = now() WHERE id = $1", [ponto1.id]);
    c.encontroVencido = ponto1.id;
    c.encontroEmBatalha = (await amb.api('POST', '/historia/explorar', { token: ash.token })).dados.id;
    const batalhaHistoria = await amb.api('POST', `/historia/encontros/${c.encontroEmBatalha}/batalha`, { token: ash.token });
    assert.equal(batalhaHistoria.status, 200, JSON.stringify(batalhaHistoria.dados));
  });
  after(() => amb?.encerrar());

  // Recusas por regra ou por dado do corpo (400). As outras são o que a URL aponta e não é do
  // Gary: a API responde como se não existisse (404)
  const RECUSAS_POR_REGRA = new Set([
    'anunciar o Pokémon do Ash',
    'oferecer o Pokémon do Ash numa proposta',
    'aceitar o desafio feito ao Ash',
    'recusar o desafio feito ao Ash',
    'montar o time com os Pokémon do Ash',
    'pôr o Pokémon do Ash na própria vitrine',
  ]);

  // [descrição, método, caminho, corpo]: todas precisam ser recusadas sem mudar nada
  const TENTATIVAS = [
    ['evoluir o Pokémon do Ash', 'POST', () => `/pokemons/${c.charmander}/evoluir`, { especieId: 5 }],
    ['cuidar do Pokémon do Ash', 'POST', () => `/pokemons/${c.charmander}/cuidar`, { tipo: 'alimentar' }],
    ['roletar os golpes do Pokémon do Ash', 'POST', () => `/pokemons/${c.charmander}/golpes/roletar`],
    ['desbloquear os golpes do Pokémon do Ash', 'POST', () => `/pokemons/${c.charmander}/golpes/desbloquear`],
    ['anunciar o Pokémon do Ash', 'POST', () => '/anuncios', () => ({ pokemonId: c.charmander, preco: 10 })],
    ['cancelar o anúncio do Ash', 'DELETE', () => `/anuncios/${c.anuncioDoAsh}`],
    ['oferecer o Pokémon do Ash numa proposta', 'POST', () => `/anuncios/${c.anuncioDaMisty}/propostas`,
      () => ({ pokemonIds: [c.charmander] })],
    ['aceitar a proposta feita à Misty', 'POST', () => `/propostas/${c.propostaDoAsh}/aceitar`],
    ['recusar a proposta feita à Misty', 'POST', () => `/propostas/${c.propostaDoAsh}/recusar`],
    ['cancelar a proposta do Ash', 'DELETE', () => `/propostas/${c.propostaDoAsh}`],
    ['ver a batalha Ash x Misty', 'GET', () => `/batalhas/${c.batalha}`],
    ['atacar na batalha Ash x Misty', 'POST', () => `/batalhas/${c.batalha}/jogadas`, { tipo: 'atacar' }],
    ['desistir da batalha Ash x Misty', 'POST', () => `/batalhas/${c.batalha}/jogadas`, { tipo: 'desistir' }],
    ['aceitar o desafio feito ao Ash', 'POST', () => `/batalhas/${c.desafio}/responder`, { aceitar: true }],
    ['recusar o desafio feito ao Ash', 'POST', () => `/batalhas/${c.desafio}/responder`, { aceitar: false }],
    ['começar a batalha da história do Ash', 'POST', () => `/historia/encontros/${c.encontroEmBatalha}/batalha`],
    ['atacar na batalha da história do Ash', 'POST', () => `/historia/encontros/${c.encontroEmBatalha}/jogadas`, { tipo: 'atacar' }],
    ['fugir da batalha da história do Ash', 'POST', () => `/historia/encontros/${c.encontroEmBatalha}/jogadas`, { tipo: 'desistir' }],
    ['capturar o Pokémon que o Ash venceu', 'POST', () => `/historia/encontros/${c.encontroVencido}/capturar`],
    ['ignorar o Pokémon que o Ash venceu', 'POST', () => `/historia/encontros/${c.encontroVencido}/ignorar`],
    ['montar o time com os Pokémon do Ash', 'PUT', () => '/time', () => ({ pokemonIds: c.timeDoAsh })],
    ['pôr o Pokémon do Ash na própria vitrine', 'PUT', () => '/vitrine', () => ({ estilo: 'palco', pokemonIds: [c.charmander] })],
  ];

  for (const [descricao, metodo, caminho, corpo] of TENTATIVAS) {
    test(`não deixa ${descricao}`, async () => {
      const antes = await amb.fotografar();
      const r = await amb.api(metodo, caminho(), {
        token: c.gary.token, corpo: typeof corpo === 'function' ? corpo() : corpo,
      });
      assert.equal(r.status, RECUSAS_POR_REGRA.has(descricao) ? 400 : 404, JSON.stringify(r.dados));
      assert.ok(r.dados.erro, 'a recusa explica o motivo');
      assert.deepEqual(await amb.fotografar(), antes, 'o banco não pode mudar');
    });
  }

  test('o histórico de cuidados do Pokémon do Ash vem vazio para o Gary', async () => {
    const r = await amb.api('GET', `/pokemons/${c.charmander}/cuidados`, { token: c.gary.token });
    assert.equal(r.status, 200);
    assert.deepEqual(r.dados, []);
  });

  test('as listas do Gary não mostram batalhas, propostas nem história dos outros', async () => {
    const pedir = async (caminho) => (await amb.api('GET', caminho, { token: c.gary.token })).dados;
    assert.deepEqual(await pedir('/batalhas'), []);
    assert.deepEqual(await pedir('/propostas'), { recebidas: [], enviadas: [] });
    assert.deepEqual(await pedir('/anuncios/meus'), []);
    assert.deepEqual((await pedir('/historia')).encontros, []);
  });
});
