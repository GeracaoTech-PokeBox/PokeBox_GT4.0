// Sorteios previsíveis para os testes: as funções do jogo recebem o rng por parâmetro.

/** Um valor bem perto de 1 (o rng real nunca devolve 1) */
const QUASE_UM = 1 - 1e-9;

/**
 * Devolve os valores em ordem. Se o código pedir mais sorteios do que o teste previu,
 * dá erro: assim o teste também confere QUANTOS sorteios a regra faz.
 * @param {number[]} valores
 * @returns {import('../../src/jogo/aleatorio').Rng & { restantes: () => number }}
 */
function rngSequencia(valores) {
  const fila = [...valores];
  const rng = () => {
    if (fila.length === 0) throw new Error('rngSequencia: o código pediu mais sorteios do que o teste previu');
    return fila.shift();
  };
  rng.restantes = () => fila.length;
  return rng;
}

/** Sempre o mesmo valor */
const rngConstante = (valor) => () => valor;

module.exports = { rngSequencia, rngConstante, QUASE_UM };
