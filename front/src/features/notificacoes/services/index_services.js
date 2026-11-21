import { chamar } from '@/core';

// Notificações: o que mudou em cada aba e ainda não foi visto
export const listarNotificacoes = () => chamar('GET', '/notificacoes');
export const verNotificacao = (id) => chamar('POST', `/notificacoes/${id}/ver`);
