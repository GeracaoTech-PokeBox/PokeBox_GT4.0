// Treinadores: busca por login e lista de quem está online para ser desafiado
const { pool } = require('../../banco/db');
const config = require('../../compartilhado/config');
const model = require('./treinadores.model');

/** Logins que começam com `busca` (sem o próprio usuário) */
async function buscarTreinadores(usuarioId, busca) {
  return model.buscarLogins(pool, usuarioId, busca);
}

/**
 * Treinadores que usaram o jogo nas últimas JANELA_TREINADORES_ATIVOS_HORAS, estão online agora
 * (JANELA_ONLINE_MS) e podem ser desafiados (time completo), do acesso mais recente para o mais antigo.
 * Quem está offline fica fora, mas ainda pode ser desafiado pelo login.
 * Para cada um diz também se já existe um desafio pendente ou batalha em andamento
 * entre os dois, para o front não oferecer um desafio que o back recusaria.
 * @param {number} usuarioId  quem está pedindo (fica fora da lista)
 */
async function listarTreinadoresAtivos(usuarioId) {
  return model.listarAtivos(pool, usuarioId, {
    janelaHoras: config.JANELA_TREINADORES_ATIVOS_HORAS,
    tamanhoTime: config.TAMANHO_TIME,
    janelaOnlineSegundos: config.JANELA_ONLINE_MS / 1000,
  });
}

module.exports = { buscarTreinadores, listarTreinadoresAtivos };
