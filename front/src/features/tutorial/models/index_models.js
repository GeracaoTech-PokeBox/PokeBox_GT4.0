import { PASSOS_TUTORIAL } from '../constants/index_constants';

/**
 * Passo em que o tutorial de primeiro acesso deve abrir, ou null se não deve abrir.
 * Começa só para quem ainda não tem Pokémon (primeiro acesso) e retoma se a página recarregou no meio.
 * @param {string | null} salvo  o que lerPasso() devolveu
 */
export function passoInicial(salvo, pokemons) {
  if (salvo === 'fim') return null;

  const passo = Number.parseInt(salvo, 10);
  if (passo >= 0 && passo < PASSOS_TUTORIAL.length) {
    // Escolheu o inicial e recarregou antes de o tutorial avançar
    return PASSOS_TUTORIAL[passo].esperaInicial && pokemons.length > 0 ? passo + 1 : passo;
  }
  return pokemons.length === 0 ? 0 : null;
}
