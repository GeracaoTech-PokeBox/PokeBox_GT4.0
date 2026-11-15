// mapearCadeia transforma a /evolution-chain da PokeAPI no nível de cada evolução
const test = require('node:test');
const assert = require('node:assert/strict');
const { mapearCadeia } = require('../../src/jogo/especies');

const no = (nome, id, niveis, filhos = []) => ({
  species: { name: nome, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
  evolution_details: niveis.map((min_level) => ({ min_level })),
  evolves_to: filhos,
});

test('cadeia por nível usa o min_level da PokeAPI', () => {
  const raiz = no('charmander', 4, [], [no('charmeleon', 5, [16], [no('charizard', 6, [36])])]);
  const mapa = mapearCadeia(raiz, 1, new Map());

  assert.deepEqual(mapa.get('charmander'), [{ especieId: 5, nome: 'charmeleon', nivel: 16 }]);
  assert.deepEqual(mapa.get('charmeleon'), [{ especieId: 6, nome: 'charizard', nivel: 36 }]);
  assert.deepEqual(mapa.get('charizard'), []);
});

test('evolução sem nível (pedra, amizade) soma 20 ao nível de entrada', () => {
  const raiz = no('pichu', 172, [], [no('pikachu', 25, [null], [no('raichu', 26, [null])])]);
  const mapa = mapearCadeia(raiz, 1, new Map());

  assert.equal(mapa.get('pichu')[0].nivel, 21);
  assert.equal(mapa.get('pikachu')[0].nivel, 41);
});

test('cadeia ramificada (Eevee) gera uma evolução por galho', () => {
  const raiz = no('eevee', 133, [], [no('vaporeon', 134, [null]), no('jolteon', 135, [null]), no('espeon', 196, [null])]);
  const mapa = mapearCadeia(raiz, 1, new Map());

  assert.deepEqual(mapa.get('eevee').map((e) => [e.especieId, e.nivel]), [[134, 21], [135, 21], [196, 21]]);
});

test('com vários jeitos de evoluir vale o menor nível, e nunca passa do nível máximo', () => {
  const variosNiveis = mapearCadeia(no('a', 1, [], [no('b', 2, [30, 20, null])]), 1, new Map());
  assert.equal(variosNiveis.get('a')[0].nivel, 20);

  const tarde = mapearCadeia(no('a', 1, [], [no('b', 2, [null])]), 95, new Map());
  assert.equal(tarde.get('a')[0].nivel, 100);
});
