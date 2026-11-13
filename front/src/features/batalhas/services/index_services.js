import { chamar } from '@/core';

// Batalhas entre treinadores
export const listarBatalhas = () => chamar('GET', '/batalhas');
export const desafiar = (oponente) => chamar('POST', '/batalhas', { oponente });
export const buscarBatalha = (id) => chamar('GET', `/batalhas/${id}`);
export const responderDesafio = (id, aceitar) => chamar('POST', `/batalhas/${id}/responder`, { aceitar });
export const jogar = (id, jogada) => chamar('POST', `/batalhas/${id}/jogadas`, jogada);
export const buscarTreinadores = (busca) => chamar('GET', `/treinadores?busca=${encodeURIComponent(busca)}`);
export const listarTreinadoresAtivos = () => chamar('GET', '/treinadores/ativos');
