const test = require('node:test');
const assert = require('node:assert/strict');
// As regras testadas aqui ficam em três lugares: as do Pokémon no núcleo (usadas por várias features),
// as da história na feature historia e a montagem do card na view de pokemons.
const regras = {
  ...require('../../src/nucleo/regras'),
  ...require('../../src/features/historia/historia.regras'),
  ...require('../../src/features/pokemons/pokemons.view'),
};
const config = require('../../src/compartilhado/config');
const { ErroJogo } = require('../../src/compartilhado/erros');
const { rngSequencia, rngConstante, QUASE_UM } = require('../helpers/rng');

const HORA = 60 * 60 * 1000;

// Status base reais do Charmander
const CHARMANDER = {
  id: 4,
  nome: 'charmander',
  tipos: ['fire'],
  raridade: 'comum',
  hp_base: 39,
  ataque_base: 52,
  defesa_base: 43,
  velocidade_base: 65,
  altura_base: 7,
  peso_base: 85,
  evolucoes: [{ especieId: 5, nome: 'charmeleon', nivel: 16 }],
};

const IVS_MAXIMOS = { iv_hp: 31, iv_ataque: 31, iv_defesa: 31, iv_velocidade: 31 };

// ---------------------------------------------------------------------------
// Mint
// ---------------------------------------------------------------------------

test('sortearAtributos', async (t) => {
  await t.test('card normal: IVs de 0 a 31 e multiplicadores de 0,8 a 1,2', () => {
    // shiny?, 4 IVs, altura, peso
    const rng = rngSequencia([0.5, 0, QUASE_UM, 0.5, 0, 0, QUASE_UM]);
    assert.deepEqual(regras.sortearAtributos(rng), {
      shiny: false,
      iv_hp: 0,
      iv_ataque: 31,
      iv_defesa: 16,
      iv_velocidade: 0,
      mult_altura: 0.8,
      mult_peso: 1.2,
    });
    assert.equal(rng.restantes(), 0);
  });

  await t.test('shiny sobe o mínimo dos IVs para 20', () => {
    const rng = rngSequencia([0.005, 0, 0, 0, 0, 0.5, 0.5]);
    const atributos = regras.sortearAtributos(rng);
    assert.equal(atributos.shiny, true);
    assert.deepEqual(
      [atributos.iv_hp, atributos.iv_ataque, atributos.iv_defesa, atributos.iv_velocidade],
      [20, 20, 20, 20],
    );
  });

  await t.test('com o rng real tudo fica dentro dos limites', () => {
    for (let i = 0; i < 500; i += 1) {
      const a = regras.sortearAtributos();
      const minimo = a.shiny ? config.IV_MINIMO_SHINY : 0;
      for (const iv of [a.iv_hp, a.iv_ataque, a.iv_defesa, a.iv_velocidade]) {
        assert.ok(Number.isInteger(iv) && iv >= minimo && iv <= config.IV_MAXIMO, `IV ${iv}`);
      }
      for (const mult of [a.mult_altura, a.mult_peso]) {
        assert.ok(mult >= config.MULT_MINIMO && mult <= config.MULT_MAXIMO, `mult ${mult}`);
      }
    }
  });
});

test('medidas converte decímetros/hectogramas para m/kg aplicando o multiplicador', () => {
  assert.deepEqual(regras.medidas(CHARMANDER, { mult_altura: 1, mult_peso: 1 }), { alturaM: 0.7, pesoKg: 8.5 });
  assert.deepEqual(regras.medidas(CHARMANDER, { mult_altura: 1.2, mult_peso: 0.8 }), { alturaM: 0.84, pesoKg: 6.8 });
});

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

test('calcularStatus', async (t) => {
  await t.test('fórmula dos jogos principais no nível 50 com IVs máximos', () => {
    assert.deepEqual(
      regras.calcularStatus(CHARMANDER, { ...IVS_MAXIMOS, nivel: 50 }),
      { hp: 114, ataque: 72, defesa: 63, velocidade: 85 },
    );
  });

  await t.test('nível 1 com IVs zerados', () => {
    const ivsZerados = { iv_hp: 0, iv_ataque: 0, iv_defesa: 0, iv_velocidade: 0 };
    assert.deepEqual(
      regras.calcularStatus(CHARMANDER, { ...ivsZerados, nivel: 1 }),
      { hp: 11, ataque: 6, defesa: 5, velocidade: 6 },
    );
  });

  await t.test('afeto máximo dá +10% (arredondado para baixo)', () => {
    assert.deepEqual(
      regras.calcularStatus(CHARMANDER, { ...IVS_MAXIMOS, nivel: 50, afeto: 500 }),
      { hp: 125, ataque: 79, defesa: 69, velocidade: 93 },
    );
  });

  await t.test('bônus de evolução soma depois do afeto', () => {
    const status = regras.calcularStatus(CHARMANDER, {
      ...IVS_MAXIMOS, nivel: 50, bonus_hp: 3, bonus_ataque: 2, bonus_defesa: 0,
    });
    assert.deepEqual(status, { hp: 117, ataque: 74, defesa: 63, velocidade: 85 });
  });
});

// ---------------------------------------------------------------------------
// Afeto e cuidados
// ---------------------------------------------------------------------------

test('corações, bônus e afeto máximo', () => {
  assert.deepEqual([0, 99, 100, 499, 500, 900].map((a) => regras.coracoes(a)), [0, 0, 1, 4, 5, 5]);
  assert.equal(regras.coracoes(), 0);
  assert.equal(regras.afetoMaximo(499), false);
  assert.equal(regras.afetoMaximo(500), true);
  assert.equal(regras.afetoMaximo(), false);
});

test('descreverAfeto', () => {
  assert.deepEqual(regras.descreverAfeto(0), {
    pontos: 0, coracoes: 0, maximo: false, faltamParaProximo: 100, bonusStatus: 0,
  });
  assert.deepEqual(regras.descreverAfeto(250), {
    pontos: 250, coracoes: 2, maximo: false, faltamParaProximo: 50, bonusStatus: 0.04,
  });
  assert.deepEqual(regras.descreverAfeto(500), {
    pontos: 500, coracoes: 5, maximo: true, faltamParaProximo: null, bonusStatus: 0.1,
  });
});

test('bemEstarAtual', async (t) => {
  const agora = new Date('2026-01-10T12:00:00Z');

  await t.test('sem data usa os valores guardados (ou o inicial)', () => {
    assert.deepEqual(regras.bemEstarAtual({}, agora), { humor: 50, energia: 50 });
    assert.deepEqual(regras.bemEstarAtual({ humor: 80, energia: 60 }, agora), { humor: 80, energia: 60 });
  });

  await t.test('humor cai 2/h e energia 1/h', () => {
    const pokemon = { humor: 80, energia: 60, bem_estar_em: new Date(agora.getTime() - 10 * HORA) };
    assert.deepEqual(regras.bemEstarAtual(pokemon, agora), { humor: 60, energia: 50 });
  });

  await t.test('aceita data em texto (como vem do banco)', () => {
    const pokemon = { humor: 80, energia: 60, bem_estar_em: new Date(agora.getTime() - 10 * HORA).toISOString() };
    assert.deepEqual(regras.bemEstarAtual(pokemon, agora), { humor: 60, energia: 50 });
  });

  await t.test('nunca fica negativo, e data no futuro não altera', () => {
    const antigo = { humor: 80, energia: 60, bem_estar_em: new Date(agora.getTime() - 100 * HORA) };
    assert.deepEqual(regras.bemEstarAtual(antigo, agora), { humor: 0, energia: 0 });
    const futuro = { humor: 80, energia: 60, bem_estar_em: new Date(agora.getTime() + 5 * HORA) };
    assert.deepEqual(regras.bemEstarAtual(futuro, agora), { humor: 80, energia: 60 });
  });
});

test('aplicarCuidado', async (t) => {
  const agora = new Date('2026-01-10T12:00:00Z');
  const atual = { afeto: 0, humor: 50, energia: 50 };

  await t.test('cada cuidado mexe em afeto, humor e energia', () => {
    assert.deepEqual(regras.aplicarCuidado(atual, 'carinho', null, agora), { afeto: 10, humor: 65, energia: 50, ganho: 10 });
    assert.deepEqual(regras.aplicarCuidado(atual, 'brincar', null, agora), { afeto: 20, humor: 75, energia: 25, ganho: 20 });
    assert.deepEqual(regras.aplicarCuidado(atual, 'alimentar', null, agora), { afeto: 20, humor: 50, energia: 85, ganho: 20 });
  });

  await t.test('humor, energia e afeto param no máximo; o ganho é o que entrou de fato', () => {
    const cheio = { afeto: 495, humor: 95, energia: 90 };
    assert.deepEqual(regras.aplicarCuidado(cheio, 'carinho', null, agora), { afeto: 500, humor: 100, energia: 90, ganho: 5 });
    assert.equal(regras.aplicarCuidado(cheio, 'alimentar', null, agora).energia, 100);
  });

  await t.test('brincar exige energia suficiente', () => {
    assert.throws(() => regras.aplicarCuidado({ ...atual, energia: 24 }, 'brincar', null, agora), /cansado demais/);
    assert.equal(regras.aplicarCuidado({ ...atual, energia: 25 }, 'brincar', null, agora).energia, 0);
  });

  await t.test('respeita a espera desde o último cuidado do mesmo tipo', () => {
    const quaseDuasHoras = new Date(agora.getTime() - 2 * HORA + 1000);
    assert.throws(() => regras.aplicarCuidado(atual, 'carinho', quaseDuasHoras, agora), ErroJogo);
    const duasHoras = new Date(agora.getTime() - 2 * HORA);
    assert.equal(regras.aplicarCuidado(atual, 'carinho', duasHoras, agora).afeto, 10);
  });

  await t.test('tipo inválido é ErroJogo (vira 400 na rota)', () => {
    assert.throws(() => regras.aplicarCuidado(atual, 'banho', null, agora), ErroJogo);
  });

  await t.test('nome herdado de Object também é recusado', () => {
    assert.throws(() => regras.aplicarCuidado(atual, 'toString', null, agora), ErroJogo);
    assert.throws(() => regras.aplicarCuidado(atual, 'constructor', null, agora), ErroJogo);
  });
});

// ---------------------------------------------------------------------------
// XP e evolução
// ---------------------------------------------------------------------------

test('aplicarXp', async (t) => {
  await t.test('acumula sem subir', () => {
    assert.deepEqual(regras.aplicarXp({ nivel: 1, xp: 0 }, 99), { nivel: 1, xp: 99, niveisGanhos: 0 });
  });

  await t.test('sobe exatamente no limite e guarda o que sobrou', () => {
    assert.deepEqual(regras.aplicarXp({ nivel: 1, xp: 0 }, 100), { nivel: 2, xp: 0, niveisGanhos: 1 });
    assert.deepEqual(regras.aplicarXp({ nivel: 5, xp: 450 }, 60), { nivel: 6, xp: 10, niveisGanhos: 1 });
  });

  await t.test('sobe vários níveis de uma vez', () => {
    // 100 (1->2) + 200 (2->3) = 300, sobram 50
    assert.deepEqual(regras.aplicarXp({ nivel: 1, xp: 0 }, 350), { nivel: 3, xp: 50, niveisGanhos: 2 });
  });

  await t.test('para no nível máximo e zera o xp', () => {
    assert.deepEqual(regras.aplicarXp({ nivel: 99, xp: 0 }, 1_000_000), { nivel: 100, xp: 0, niveisGanhos: 1 });
    assert.deepEqual(regras.aplicarXp({ nivel: 100, xp: 0 }, 500), { nivel: 100, xp: 0, niveisGanhos: 0 });
  });
});

test('sortearBonusEvolucao', () => {
  assert.deepEqual(regras.sortearBonusEvolucao(rngConstante(0.99)), { hp: 0, ataque: 0, defesa: 0, velocidade: 0 });

  // hp: ganhou (0,1 < 0,3) com 1 ponto; ataque: não; defesa: ganhou com 5; velocidade: não
  const rng = rngSequencia([0.1, 0, 0.5, 0.2, QUASE_UM, 0.5]);
  assert.deepEqual(regras.sortearBonusEvolucao(rng), { hp: 1, ataque: 0, defesa: 5, velocidade: 0 });
  assert.equal(rng.restantes(), 0);
});

test('evolucoesDisponiveis libera a partir do nível pedido', () => {
  assert.deepEqual(regras.evolucoesDisponiveis(CHARMANDER, { nivel: 15 }), []);
  assert.deepEqual(regras.evolucoesDisponiveis(CHARMANDER, { nivel: 16 }), CHARMANDER.evolucoes);
  assert.deepEqual(regras.evolucoesDisponiveis({ evolucoes: [] }, { nivel: 100 }), []);
});

// ---------------------------------------------------------------------------
// História
// ---------------------------------------------------------------------------

test('forcaDoPonto vai de 0,1x a 5,0x', () => {
  assert.equal(regras.forcaDoPonto(1, 1), 0.1);
  assert.equal(regras.forcaDoPonto(1, 10), 1);
  assert.equal(regras.forcaDoPonto(2, 1), 1.1);
  assert.equal(regras.forcaDoPonto(3, 7), 2.7);
  assert.equal(regras.forcaDoPonto(5, 10), 5);
});

test('proximoPonto segue a trilha linear e termina em null', () => {
  assert.deepEqual(regras.proximoPonto(0), { trilha: 1, ponto: 1 });
  assert.deepEqual(regras.proximoPonto(9), { trilha: 1, ponto: 10 });
  assert.deepEqual(regras.proximoPonto(10), { trilha: 2, ponto: 1 });
  assert.deepEqual(regras.proximoPonto(49), { trilha: 5, ponto: 10 });
  assert.equal(regras.proximoPonto(50), null);
  assert.equal(regras.proximoPonto(60), null);
});

test('nivelSelvagem acompanha a força entre 1 e 100', () => {
  assert.equal(regras.nivelSelvagem(0.1), 5);
  assert.equal(regras.nivelSelvagem(1), 50);
  assert.equal(regras.nivelSelvagem(2), 100);
  assert.equal(regras.nivelSelvagem(5), 100);
  assert.equal(regras.nivelSelvagem(0.001), 1);
});

test('statusSelvagem multiplica o status do nível 50 pela força, com mínimo 1', () => {
  assert.deepEqual(regras.statusSelvagem(CHARMANDER, IVS_MAXIMOS, 1), { hp: 114, ataque: 72, defesa: 63, velocidade: 85 });
  assert.deepEqual(regras.statusSelvagem(CHARMANDER, IVS_MAXIMOS, 0.1), { hp: 11, ataque: 7, defesa: 6, velocidade: 8 });
  assert.deepEqual(regras.statusSelvagem(CHARMANDER, IVS_MAXIMOS, 0.001), { hp: 1, ataque: 1, defesa: 1, velocidade: 1 });
});

test('chanceDeCaptura interpola entre os pontos da tabela', () => {
  assert.equal(regras.chanceDeCaptura(1), 0.1);
  assert.equal(regras.chanceDeCaptura(3), 0.1);
  assert.equal(regras.chanceDeCaptura(24), 0.15);
  assert.equal(regras.chanceDeCaptura(45), 0.2);
  assert.equal(regras.chanceDeCaptura(150), 0.35);
  assert.equal(regras.chanceDeCaptura(255), 0.5);
  assert.equal(regras.chanceDeCaptura(300), 0.5);
});

test('resultadoDaCaptura: captura, fuga na última tentativa ou segue como estava', () => {
  const max = config.TENTATIVAS_CAPTURA_MAXIMO;
  assert.deepEqual(regras.resultadoDaCaptura({ capturou: true, tentativas: max, statusAtual: 'vencido' }), { status: 'capturado', fugiu: false });
  assert.deepEqual(regras.resultadoDaCaptura({ capturou: false, tentativas: max, statusAtual: 'vencido' }), { status: 'fugiu', fugiu: true });
  assert.deepEqual(regras.resultadoDaCaptura({ capturou: false, tentativas: max - 1, statusAtual: 'vencido' }), { status: 'vencido', fugiu: false });
});

test('xpDaHistoria é progressivo e a revanche paga metade', () => {
  assert.equal(regras.xpDaHistoria(0.1), 515);
  assert.equal(regras.xpDaHistoria(1), 6500);
  assert.equal(regras.xpDaHistoria(2), 16000);
  assert.equal(regras.xpDaHistoria(5), 62500);
  assert.equal(regras.xpDaHistoria(1, true), 3250);
});

// ---------------------------------------------------------------------------
// Card para o front
// ---------------------------------------------------------------------------

test('card', async (t) => {
  const linha = {
    ...CHARMANDER,
    ...IVS_MAXIMOS,
    id: 10,
    mint_numero: 7,
    especie_id: 4,
    especie_original_id: 4,
    shiny: false,
    nivel: 16,
    xp: 30,
    mult_altura: 1,
    mult_peso: 1,
    afeto: 0,
    posicao_time: 1,
    posicao_vitrine: null,
    anunciado: null,
    golpes: [],
    golpes_detalhe: [],
    golpes_desbloqueados: false,
  };

  await t.test('monta o card com status, afeto e evoluções', () => {
    const card = regras.card(linha);
    assert.equal(card.id, 10);
    assert.equal(card.mintNumero, 7);
    assert.equal(card.xpParaSubir, 1600);
    assert.equal(card.anunciado, false);
    assert.equal(card.afeto.coracoes, 0);
    assert.deepEqual(card.evolucoes, [{ especieId: 5, nome: 'charmeleon', nivel: 16, disponivel: true }]);
    assert.deepEqual(card.status, regras.calcularStatus(CHARMANDER, linha));
    assert.equal(card.alturaM, 0.7);
  });

  await t.test('não mostra xp para subir no nível máximo', () => {
    assert.equal(regras.card({ ...linha, nivel: 100 }).xpParaSubir, null);
  });

  await t.test('golpes: primeira roleta grátis, depois paga; liberados por afeto ou desbloqueio', () => {
    const semGolpes = regras.card(linha);
    assert.equal(semGolpes.custoRoletaGolpes, 0);
    assert.equal(semGolpes.golpesLiberados, false);

    assert.equal(regras.card({ ...linha, golpes: [1, 2] }).custoRoletaGolpes, config.CUSTO_ROLETA_GOLPES);
    assert.equal(regras.card({ ...linha, afeto: 500 }).golpesLiberados, true);
    assert.equal(regras.card({ ...linha, golpes_desbloqueados: true }).golpesLiberados, true);
  });

  await t.test('cuidadosDisponiveisEm: null quando já pode, senão a hora em que libera', () => {
    assert.deepEqual(regras.card(linha).cuidadosDisponiveisEm, { carinho: null, brincar: null, alimentar: null });

    const umaHoraAtras = new Date(Date.now() - HORA);
    const cincoHorasAtras = new Date(Date.now() - 5 * HORA);
    const { cuidadosDisponiveisEm } = regras.card({
      ...linha, ultimos_cuidados: { carinho: umaHoraAtras, brincar: cincoHorasAtras.toISOString() },
    });
    assert.equal(cuidadosDisponiveisEm.carinho.getTime(), umaHoraAtras.getTime() + 2 * HORA);
    assert.equal(cuidadosDisponiveisEm.brincar, null);
    assert.equal(cuidadosDisponiveisEm.alimentar, null);
  });
});
