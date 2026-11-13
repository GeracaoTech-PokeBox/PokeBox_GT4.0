import { chamar } from '@/core';

// Cards da coleção: inicial, evolução, cuidados e golpes
export const escolherInicial = (especieId) => chamar('POST', '/eu/inicial', { especieId });
export const evoluir = (pokemonId, especieId) => chamar('POST', `/pokemons/${pokemonId}/evoluir`, { especieId });
export const cuidar = (pokemonId, tipo) => chamar('POST', `/pokemons/${pokemonId}/cuidar`, { tipo });
export const listarCuidados = (pokemonId) => chamar('GET', `/pokemons/${pokemonId}/cuidados`);
export const roletarGolpes = (pokemonId) => chamar('POST', `/pokemons/${pokemonId}/golpes/roletar`);
export const desbloquearGolpes = (pokemonId) => chamar('POST', `/pokemons/${pokemonId}/golpes/desbloquear`);
