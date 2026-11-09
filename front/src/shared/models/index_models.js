import { TAMANHO_TIME } from '../constants/index_constants';

// Regras de negócio usadas por mais de uma feature (batalhas e história)

// [DRY] Se o treinador já montou o time completo e pode batalhar. A mesma conta estava copiada
// em useBatalhasViewModel e useHistoriaViewModel.
export const temTimeCompleto = (pokemons) => pokemons.filter((p) => p.posicaoTime).length === TAMANHO_TIME;
