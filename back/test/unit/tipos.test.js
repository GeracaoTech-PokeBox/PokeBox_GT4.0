const test = require('node:test');
const assert = require('node:assert/strict');
const { efetividade } = require('../../src/nucleo/tipos');

test('vantagem simples: 2x, 0,5x e 0x', () => {
  assert.equal(efetividade('fire', ['grass']), 2);
  assert.equal(efetividade('fire', ['water']), 0.5);
  assert.equal(efetividade('normal', ['ghost']), 0);
  assert.equal(efetividade('fire', ['normal']), 1);
});

test('dois tipos se multiplicam', () => {
  assert.equal(efetividade('fire', ['grass', 'bug']), 4);
  assert.equal(efetividade('grass', ['water', 'ground']), 4);
  assert.equal(efetividade('fire', ['water', 'dragon']), 0.25);
  assert.equal(efetividade('fire', ['grass', 'water']), 1);
});

test('imunidade zera, em qualquer posição', () => {
  assert.equal(efetividade('electric', ['ground', 'water']), 0);
  assert.equal(efetividade('electric', ['water', 'ground']), 0);
});

test('tipo desconhecido ou alvo sem tipo conta como neutro', () => {
  assert.equal(efetividade('shadow', ['grass']), 1);
  assert.equal(efetividade('fire', ['tipo-novo']), 1);
  assert.equal(efetividade('fire', []), 1);
  assert.equal(efetividade('fire'), 1);
});
