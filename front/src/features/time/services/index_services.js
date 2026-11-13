import { chamar } from '@/core';

// Time de batalha
export const salvarTime = (pokemonIds) => chamar('PUT', '/time', { pokemonIds });
