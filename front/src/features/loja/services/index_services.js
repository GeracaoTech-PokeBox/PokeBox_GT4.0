import { chamar } from '@/core';

// Loja
export const comprarPokemon = (geracao) => chamar('POST', '/loja/comprar', { geracao });
export const comprarPokebolas = (quantidade) => chamar('POST', '/loja/pokebolas', { quantidade });
