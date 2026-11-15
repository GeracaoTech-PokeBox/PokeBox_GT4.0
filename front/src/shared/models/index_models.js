import { TAMANHO_TIME } from '../constants/index_constants';

// Regras de negócio usadas por mais de uma feature (batalhas e história)

// [DRY] Se o treinador já montou o time completo e pode batalhar. A mesma conta estava copiada
// em useBatalhasViewModel e useHistoriaViewModel.
export const temTimeCompleto = (pokemons) => pokemons.filter((p) => p.posicaoTime).length === TAMANHO_TIME;

// Telas do menu abertas logo depois de escolher o inicial. As outras liberam com TAMANHO_TIME
// Pokémon (o inicial + dois da Loja), o bastante para montar o time.
export const TELAS_LIVRES = ['pokemons', 'loja', 'sobre'];

// Sem nenhum Pokémon, o treinador ainda não escolheu o inicial: nenhuma tela do menu abre antes disso
export const semInicial = (pokemons) => pokemons.length === 0;

export const menuLiberado = (pokemons) => pokemons.length >= TAMANHO_TIME;

export const telaLiberada = (tela, pokemons) => !semInicial(pokemons)
  && (TELAS_LIVRES.includes(tela) || menuLiberado(pokemons));
