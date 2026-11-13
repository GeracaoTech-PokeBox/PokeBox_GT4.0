import { chamar } from '@/core';

// Modo história
export const buscarHistoria = () => chamar('GET', '/historia');
export const explorarHistoria = () => chamar('POST', '/historia/explorar');
export const batalharNaHistoria = (encontroId) => chamar('POST', `/historia/encontros/${encontroId}/batalha`);
export const refazerPonto = (trilha, ponto) => chamar('POST', `/historia/trilhas/${trilha}/pontos/${ponto}/refazer`);
export const jogarNaHistoria = (encontroId, jogada) => chamar('POST', `/historia/encontros/${encontroId}/jogadas`, jogada);
export const capturar = (encontroId) => chamar('POST', `/historia/encontros/${encontroId}/capturar`);
export const ignorarPokemon = (encontroId) => chamar('POST', `/historia/encontros/${encontroId}/ignorar`);
