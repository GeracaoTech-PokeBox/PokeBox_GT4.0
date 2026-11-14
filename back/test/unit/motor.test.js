const test = require('node:test');
const assert = require('node:assert/strict');
const motor = require('../../src/jogo/motor');
const { ErroJogo } = require('../../src/jogo/erros');
const { rngSequencia, QUASE_UM } = require('../helpers/rng');

// ---------------------------------------------------------------------------
// Fábricas
// ---------------------------------------------------------------------------

let proximoId = 1;

/** Pokémon já em batalha. Com nível 50, ataque 100 x defesa 100, o ataque básico tira 24 (sem variação) */
function emBatalha(campos = {}) {
  const id = proximoId;
  proximoId += 1;
  return {
    pokemonId: id,
    mintNumero: id,
    especieId: 1,
    nome: `poke${id}`,
    shiny: false,
    nivel: 50,
    hpMax: 100,
    hp: 100,
    ataque: 100,
    defesa: 100,
    velocidade: 50,
    afetoMaximo: false,
    resistiu: false,
    tipos: ['normal'],
    golpes: [],
    ...campos,
  };
}

const lado = (usuarioId, pokemons, campos = {}) => ({
  usuarioId, login: `treinador${usuarioId}`, ativo: 0, timeoutsSeguidos: 0, pokemons, ...campos,
});

/** Batalha 1x1 (ou mais) com a vez do lado 0 */
const estado = (pokemonsA, pokemonsB, { vez = 0 } = {}) => ({
  lados: [lado(1, pokemonsA), lado(2, pokemonsB)],
  vez,
});

const golpe = (campos = {}) => ({
  id: 52, nome: 'ember', tipo: 'fire', classe: 'special', poder: 50, precisao: 100, pp: 25, ppMax: 25, ...campos,
});

// Sem crítico e variação máxima (100%): o dano fica exatamente o "base"
const SEM_CRITICO_DANO_CHEIO = [0.5, QUASE_UM];

// ---------------------------------------------------------------------------
// montarLado / criarEstado
// ---------------------------------------------------------------------------

test('montarLado congela os status e prepara os golpes', () => {
  const especie = {
    id: 4, nome: 'charmander', tipos: ['fire'], hp_base: 39, ataque_base: 52, defesa_base: 43, velocidade_base: 65,
  };
  const pokemon = {
    id: 99, mint_numero: 3, shiny: true, nivel: 50, afeto: 500,
    iv_hp: 31, iv_ataque: 31, iv_defesa: 31, iv_velocidade: 31,
  };
  const golpes = [{ id: 52, nome: 'ember', tipo: 'fire', classe: 'special', poder: 40, precisao: 100, pp: 25 }];

  const resultado = motor.montarLado({ id: 1, login: 'ash' }, [{ pokemon, especie, golpes }]);

  assert.equal(resultado.ativo, 0);
  assert.equal(resultado.timeoutsSeguidos, 0);
  assert.deepEqual(resultado.pokemons[0], {
    pokemonId: 99,
    mintNumero: 3,
    especieId: 4,
    nome: 'charmander',
    shiny: true,
    nivel: 50,
    hpMax: 125,
    hp: 125,
    ataque: 79,
    defesa: 69,
    velocidade: 93,
    afetoMaximo: true,
    resistiu: false,
    tipos: ['fire'],
    golpes: [{ ...golpes[0], ppMax: 25 }],
  });
});

test('montarLado aceita espécie sem tipos e Pokémon sem golpes', () => {
  const especie = { id: 1, nome: 'x', hp_base: 10, ataque_base: 10, defesa_base: 10, velocidade_base: 10 };
  const pokemon = { id: 1, mint_numero: 1, shiny: false, nivel: 5, iv_hp: 0, iv_ataque: 0, iv_defesa: 0, iv_velocidade: 0 };
  const [p] = motor.montarLado({ id: 1, login: 'a' }, [{ pokemon, especie }]).pokemons;
  assert.deepEqual(p.tipos, []);
  assert.deepEqual(p.golpes, []);
  assert.equal(p.afetoMaximo, false);
});

test('criarEstado: começa o mais rápido, empate vai para o sorteio', () => {
  const rapido = () => emBatalha({ velocidade: 60 });
  const lento = () => emBatalha({ velocidade: 50 });

  // Sem empate não sorteia nada (rngSequencia vazio daria erro)
  assert.equal(motor.criarEstado(lado(1, [rapido()]), lado(2, [lento()]), rngSequencia([])).vez, 0);
  assert.equal(motor.criarEstado(lado(1, [lento()]), lado(2, [rapido()]), rngSequencia([])).vez, 1);

  assert.equal(motor.criarEstado(lado(1, [lento()]), lado(2, [lento()]), rngSequencia([0.4])).vez, 0);
  assert.equal(motor.criarEstado(lado(1, [lento()]), lado(2, [lento()]), rngSequencia([0.6])).vez, 1);
});

// ---------------------------------------------------------------------------
// calcularDano
// ---------------------------------------------------------------------------

test('calcularDano', async (t) => {
  const atacante = emBatalha();
  const defensor = emBatalha();

  await t.test('ataque básico: fórmula base e variação de 85% a 100%', () => {
    assert.deepEqual(
      motor.calcularDano(atacante, defensor, rngSequencia(SEM_CRITICO_DANO_CHEIO)),
      { dano: 24, critico: false, efetividade: 1 },
    );
    assert.equal(motor.calcularDano(atacante, defensor, rngSequencia([0.5, 0])).dano, 20); // 24 * 0,85
  });

  await t.test('crítico multiplica por 1,5', () => {
    assert.deepEqual(
      motor.calcularDano(atacante, defensor, rngSequencia([0.01, QUASE_UM])),
      { dano: 36, critico: true, efetividade: 1 },
    );
  });

  await t.test('quem é mais rápido tem o dobro de chance de crítico', () => {
    // 0,1 fica entre 1/16 e 1/8
    assert.equal(motor.calcularDano(atacante, defensor, rngSequencia([0.1, QUASE_UM])).critico, false);
    const rapido = emBatalha({ velocidade: 60 });
    assert.equal(motor.calcularDano(rapido, defensor, rngSequencia([0.1, QUASE_UM])).critico, true);
  });

  await t.test('golpe usa o próprio poder', () => {
    const forte = golpe({ tipo: 'water', poder: 100 });
    assert.equal(motor.calcularDano(atacante, defensor, rngSequencia(SEM_CRITICO_DANO_CHEIO), forte).dano, 46);
  });

  await t.test('golpe do mesmo tipo (1,5x) e super efetivo (2x) se multiplicam', () => {
    const fogo = emBatalha({ tipos: ['fire'] });
    const planta = emBatalha({ tipos: ['grass'] });
    assert.deepEqual(
      motor.calcularDano(fogo, planta, rngSequencia(SEM_CRITICO_DANO_CHEIO), golpe()),
      { dano: 72, critico: false, efetividade: 2 },
    );
  });

  await t.test('imunidade dá 0 sem nem sortear', () => {
    const fantasma = emBatalha({ tipos: ['ghost'] });
    assert.deepEqual(
      motor.calcularDano(atacante, fantasma, rngSequencia([]), golpe({ tipo: 'normal' })),
      { dano: 0, critico: false, efetividade: 0 },
    );
  });

  await t.test('dano mínimo é 1 quando o golpe acerta', () => {
    const fraco = emBatalha({ nivel: 1, ataque: 1, tipos: [] });
    const parede = emBatalha({ defesa: 10000, tipos: ['water', 'dragon'] });
    assert.equal(motor.calcularDano(fraco, parede, rngSequencia(SEM_CRITICO_DANO_CHEIO), golpe()).dano, 1);
  });

  await t.test('estado antigo sem tipos conta como neutro', () => {
    const semTipo = emBatalha({ tipos: undefined });
    assert.equal(motor.calcularDano(semTipo, emBatalha({ tipos: undefined }), rngSequencia(SEM_CRITICO_DANO_CHEIO), golpe()).dano, 24);
  });
});

// ---------------------------------------------------------------------------
// aplicarAcao
// ---------------------------------------------------------------------------

test('aplicarAcao: atacar', async (t) => {
  await t.test('tira PS do oponente e passa a vez', () => {
    const a = emBatalha();
    const b = emBatalha();
    const { estado: novo, eventos, fim } = motor.aplicarAcao(estado([a], [b]), 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO));

    assert.equal(fim, null);
    assert.equal(novo.vez, 1);
    assert.equal(novo.lados[1].pokemons[0].hp, 76);
    assert.deepEqual(eventos, [{
      tipo: 'dano', lado: 0, atacante: a.pokemonId, alvo: b.pokemonId, dano: 24, critico: false, hpRestante: 76,
    }]);
  });

  await t.test('não altera o estado recebido', () => {
    const original = estado([emBatalha()], [emBatalha()]);
    const copia = structuredClone(original);
    motor.aplicarAcao(original, 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO));
    assert.deepEqual(original, copia);
  });

  await t.test('fora da vez é ErroJogo', () => {
    const atual = estado([emBatalha()], [emBatalha()], { vez: 1 });
    assert.throws(() => motor.aplicarAcao(atual, 0, { tipo: 'atacar' }, rngSequencia([])), ErroJogo);
  });

  await t.test('jogada de verdade zera os timeouts seguidos', () => {
    const atual = estado([emBatalha()], [emBatalha()]);
    atual.lados[0].timeoutsSeguidos = 1;
    const { estado: novo } = motor.aplicarAcao(atual, 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO));
    assert.equal(novo.lados[0].timeoutsSeguidos, 0);
  });
});

test('aplicarAcao: nocaute', async (t) => {
  await t.test('o próximo vivo entra sozinho, pulando quem já caiu', () => {
    const b1 = emBatalha({ hp: 10 });
    const b2 = emBatalha({ hp: 0 });
    const b3 = emBatalha({ hp: 50 });
    const { estado: novo, eventos, fim } = motor.aplicarAcao(
      estado([emBatalha()], [b1, b2, b3]), 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO),
    );

    assert.equal(fim, null);
    assert.equal(novo.lados[1].ativo, 2);
    assert.equal(novo.lados[1].pokemons[0].hp, 0);
    assert.equal(novo.vez, 1);
    assert.deepEqual(eventos.map((e) => e.tipo), ['dano', 'nocaute', 'entrou']);
    assert.equal(eventos[2].indice, 2);
  });

  await t.test('o último nocaute termina a batalha', () => {
    const { fim, eventos } = motor.aplicarAcao(
      estado([emBatalha()], [emBatalha({ hp: 10 })]), 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO),
    );
    assert.deepEqual(fim, { vencedor: 0, motivo: 'nocaute' });
    assert.deepEqual(eventos.map((e) => e.tipo), ['dano', 'nocaute']);
  });

  await t.test('afeto máximo: aguenta com 1 PS uma vez por batalha', () => {
    const atual = estado([emBatalha()], [emBatalha({ hp: 10, afetoMaximo: true })]);

    // 3º sorteio: 0,1 < 30% de chance de resistir
    const primeiro = motor.aplicarAcao(atual, 0, { tipo: 'atacar' }, rngSequencia([...SEM_CRITICO_DANO_CHEIO, 0.1]));
    assert.equal(primeiro.fim, null);
    assert.equal(primeiro.estado.lados[1].pokemons[0].hp, 1);
    assert.equal(primeiro.estado.lados[1].pokemons[0].resistiu, true);
    assert.deepEqual(primeiro.eventos.map((e) => e.tipo), ['dano', 'resistiu']);

    // Já resistiu: o próximo golpe letal nem sorteia a chance
    const depois = { ...primeiro.estado, vez: 0 };
    const segundo = motor.aplicarAcao(depois, 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO));
    assert.deepEqual(segundo.fim, { vencedor: 0, motivo: 'nocaute' });
  });

  await t.test('afeto máximo sem sorte no sorteio cai normalmente', () => {
    const atual = estado([emBatalha()], [emBatalha({ hp: 10, afetoMaximo: true })]);
    const { fim } = motor.aplicarAcao(atual, 0, { tipo: 'atacar' }, rngSequencia([...SEM_CRITICO_DANO_CHEIO, 0.5]));
    assert.deepEqual(fim, { vencedor: 0, motivo: 'nocaute' });
  });

  await t.test('golpe que não é letal não gasta a chance de resistir', () => {
    const atual = estado([emBatalha()], [emBatalha({ hp: 100, afetoMaximo: true })]);
    const rng = rngSequencia(SEM_CRITICO_DANO_CHEIO);
    const { estado: novo } = motor.aplicarAcao(atual, 0, { tipo: 'atacar' }, rng);
    assert.equal(novo.lados[1].pokemons[0].resistiu, false);
  });
});

test('aplicarAcao: golpe especial', async (t) => {
  const comGolpe = (campos) => emBatalha({ tipos: ['fire'], golpes: [golpe(campos)] });

  await t.test('acerta, gasta 1 PP e informa o golpe e a efetividade', () => {
    const atual = estado([comGolpe({ pp: 1 })], [emBatalha({ hp: 200, tipos: ['grass'] })]);
    // precisão (0,5 * 100 < 100 acerta), crítico, variação
    const { estado: novo, eventos } = motor.aplicarAcao(atual, 0, { tipo: 'golpe', indice: 0 }, rngSequencia([0.5, ...SEM_CRITICO_DANO_CHEIO]));

    assert.equal(novo.lados[0].pokemons[0].golpes[0].pp, 0);
    assert.equal(atual.lados[0].pokemons[0].golpes[0].pp, 1, 'o estado original continua com o PP');
    assert.equal(novo.lados[1].pokemons[0].hp, 128);
    assert.equal(eventos[0].golpe, 'ember');
    assert.equal(eventos[0].tipoGolpe, 'fire');
    assert.equal(eventos[0].efetividade, 2);
    assert.equal(novo.vez, 1);
  });

  await t.test('pode errar pela precisão: gasta o PP e passa a vez', () => {
    const atual = estado([comGolpe({ precisao: 50 })], [emBatalha()]);
    const { estado: novo, eventos, fim } = motor.aplicarAcao(atual, 0, { tipo: 'golpe', indice: 0 }, rngSequencia([0.6]));

    assert.equal(fim, null);
    assert.deepEqual(eventos.map((e) => e.tipo), ['errou']);
    assert.equal(novo.lados[1].pokemons[0].hp, 100);
    assert.equal(novo.lados[0].pokemons[0].golpes[0].pp, 24);
    assert.equal(novo.vez, 1);
  });

  await t.test('precisão null nunca erra (não sorteia a precisão)', () => {
    const atual = estado([comGolpe({ precisao: null })], [emBatalha()]);
    const rng = rngSequencia(SEM_CRITICO_DANO_CHEIO);
    const { eventos } = motor.aplicarAcao(atual, 0, { tipo: 'golpe', indice: 0 }, rng);
    assert.equal(eventos[0].tipo, 'dano');
    assert.equal(rng.restantes(), 0);
  });

  await t.test('golpe pode nocautear e encerrar a batalha', () => {
    const atual = estado([comGolpe()], [emBatalha({ hp: 5 })]);
    const { fim } = motor.aplicarAcao(atual, 0, { tipo: 'golpe', indice: 0 }, rngSequencia([0.5, ...SEM_CRITICO_DANO_CHEIO]));
    assert.deepEqual(fim, { vencedor: 0, motivo: 'nocaute' });
  });

  await t.test('sem PP ou índice inválido é ErroJogo', () => {
    const semPp = estado([comGolpe({ pp: 0 })], [emBatalha()]);
    assert.throws(() => motor.aplicarAcao(semPp, 0, { tipo: 'golpe', indice: 0 }, rngSequencia([])), /não tem mais PP/);
    assert.throws(() => motor.aplicarAcao(semPp, 0, { tipo: 'golpe', indice: 5 }, rngSequencia([])), /Golpe inválido/);
    const semGolpes = estado([emBatalha({ golpes: undefined })], [emBatalha()]);
    assert.throws(() => motor.aplicarAcao(semGolpes, 0, { tipo: 'golpe', indice: 0 }, rngSequencia([])), /Golpe inválido/);
  });
});

test('aplicarAcao: trocar', async (t) => {
  await t.test('troca o Pokémon em campo e passa a vez, sem sortear nada', () => {
    const atual = estado([emBatalha(), emBatalha()], [emBatalha()]);
    const { estado: novo, eventos, fim } = motor.aplicarAcao(atual, 0, { tipo: 'trocar', indice: 1 }, rngSequencia([]));
    assert.equal(fim, null);
    assert.equal(novo.lados[0].ativo, 1);
    assert.equal(novo.vez, 1);
    assert.deepEqual(eventos, [{ tipo: 'entrou', lado: 0, indice: 1 }]);
  });

  await t.test('recusa o que já está em campo, o nocauteado e índice inexistente', () => {
    const atual = estado([emBatalha(), emBatalha({ hp: 0 })], [emBatalha()]);
    assert.throws(() => motor.aplicarAcao(atual, 0, { tipo: 'trocar', indice: 0 }), /já está em campo/);
    assert.throws(() => motor.aplicarAcao(atual, 0, { tipo: 'trocar', indice: 1 }), /nocauteado/);
    assert.throws(() => motor.aplicarAcao(atual, 0, { tipo: 'trocar', indice: 9 }), /Pokémon inválido/);
  });
});

test('aplicarAcao: desistir vale a qualquer momento, até fora da vez', () => {
  const atual = estado([emBatalha()], [emBatalha()], { vez: 1 });
  const { fim, eventos } = motor.aplicarAcao(atual, 0, { tipo: 'desistir' }, rngSequencia([]));
  assert.deepEqual(fim, { vencedor: 1, motivo: 'desistencia' });
  assert.deepEqual(eventos, [{ tipo: 'desistiu', lado: 0 }]);
});

test('aplicarAcao: ação desconhecida é ErroJogo', () => {
  const atual = estado([emBatalha()], [emBatalha()]);
  assert.throws(() => motor.aplicarAcao(atual, 0, { tipo: 'fugir' }, rngSequencia([])), ErroJogo);
});

// ---------------------------------------------------------------------------
// aplicarTimeout
// ---------------------------------------------------------------------------

test('aplicarTimeout', async (t) => {
  await t.test('o primeiro passa a vez e conta o timeout', () => {
    const atual = estado([emBatalha()], [emBatalha()]);
    const { estado: novo, eventos, fim } = motor.aplicarTimeout(atual);
    assert.equal(fim, null);
    assert.equal(novo.vez, 1);
    assert.equal(novo.lados[0].timeoutsSeguidos, 1);
    assert.deepEqual(eventos, [{ tipo: 'timeout', lado: 0, timeoutsSeguidos: 1 }]);
    assert.equal(atual.lados[0].timeoutsSeguidos, 0, 'não altera o estado recebido');
  });

  await t.test('o segundo seguido dá W.O. para o outro lado', () => {
    const atual = estado([emBatalha()], [emBatalha()], { vez: 1 });
    atual.lados[1].timeoutsSeguidos = 1;
    assert.deepEqual(motor.aplicarTimeout(atual).fim, { vencedor: 0, motivo: 'wo' });
  });

  await t.test('timeout, jogada e timeout de novo não dá W.O.', () => {
    let atual = estado([emBatalha()], [emBatalha()]);
    atual = motor.aplicarTimeout(atual).estado; // A perde a vez
    atual = motor.aplicarAcao(atual, 1, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO)).estado;
    atual = motor.aplicarAcao(atual, 0, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO)).estado; // zera
    atual = motor.aplicarAcao(atual, 1, { tipo: 'atacar' }, rngSequencia(SEM_CRITICO_DANO_CHEIO)).estado;
    const { fim, estado: novo } = motor.aplicarTimeout(atual);
    assert.equal(fim, null);
    assert.equal(novo.lados[0].timeoutsSeguidos, 1);
  });
});
