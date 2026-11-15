import { TAMANHO_TIME } from '../constants/index_constants';

// Regras de negócio usadas por mais de uma feature (batalhas e história)

// [DRY] Se o treinador já montou o time completo e pode batalhar. A mesma conta estava copiada
// em useBatalhasViewModel e useHistoriaViewModel.
export const temTimeCompleto = (pokemons) => pokemons.filter((p) => p.posicaoTime).length === TAMANHO_TIME;

// Telas do menu abertas desde o início do jogo. As outras liberam com TAMANHO_TIME Pokémon
// (o inicial + dois da Loja), o bastante para montar o time.
export const TELAS_LIVRES = ['pokemons', 'loja', 'sobre'];

export const menuLiberado = (pokemons) => pokemons.length >= TAMANHO_TIME;

export const telaLiberada = (tela, pokemons) => TELAS_LIVRES.includes(tela) || menuLiberado(pokemons);
