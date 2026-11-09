import { chamar } from '@/core';

// Vitrines
export const listarVitrines = (busca = '') => chamar('GET', `/vitrines?busca=${encodeURIComponent(busca)}`);
export const buscarVitrine = (login) => chamar('GET', `/vitrines/${encodeURIComponent(login)}`);
export const salvarVitrine = (dados) => chamar('PUT', '/vitrine', dados);
