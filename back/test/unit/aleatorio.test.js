const test = require('node:test');
const assert = require('node:assert/strict');
const { rngSeguro, inteiroEntre, decimalEntre } = require('../../src/compartilhado/aleatorio');
const { rngConstante, QUASE_UM } = require('../helpers/rng');

test('inteiroEntre inclui os dois extremos', () => {
  assert.equal(inteiroEntre(rngConstante(0), 1, 6), 1);
  assert.equal(inteiroEntre(rngConstante(QUASE_UM), 1, 6), 6);
  assert.equal(inteiroEntre(rngConstante(0.5), 1, 6), 4);
  assert.equal(inteiroEntre(rngConstante(0.5), 7, 7), 7);
});

test('decimalEntre devolve no máximo 3 casas, dentro do intervalo', () => {
  assert.equal(decimalEntre(rngConstante(0), 0.8, 1.2), 0.8);
  assert.equal(decimalEntre(rngConstante(QUASE_UM), 0.8, 1.2), 1.2);
  assert.equal(decimalEntre(rngConstante(0.5), 0.8, 1.2), 1);
  assert.equal(decimalEntre(rngConstante(1 / 3), 0.8, 1.2), 0.933);
});

test('rngSeguro fica em [0, 1)', () => {
  for (let i = 0; i < 2000; i += 1) {
    const valor = rngSeguro();
    assert.ok(valor >= 0 && valor < 1, `fora do intervalo: ${valor}`);
  }
});
