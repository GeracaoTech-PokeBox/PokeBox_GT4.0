// Batalhas: formato do JSON que vai para o front
const config = require('../../compartilhado/config');

const estaOnline = (onlineEm) => Boolean(onlineEm) && Date.now() - onlineEm.getTime() < config.JANELA_ONLINE_MS;

/** Batalha (linha de SELECT_BATALHA) no formato do front, do ponto de vista de quem pediu */
function batalha(linha, usuarioId) {
  const souDesafiante = linha.desafiante_id === usuarioId;
  const desafiante = { id: linha.desafiante_id, login: linha.desafiante_login, online: estaOnline(linha.desafiante_online_em) };
  const desafiado = { id: linha.desafiado_id, login: linha.desafiado_login, online: estaOnline(linha.desafiado_online_em) };
  return {
    id: linha.id,
    status: linha.status,
    desafiante,
    desafiado,
    oponente: souDesafiante ? desafiado.login : desafiante.login,
    oponenteOnline: souDesafiante ? desafiado.online : desafiante.online,
    souDesafiante,
    minhaVez: linha.status === 'em_andamento' && linha.vez_de === usuarioId,
    turno: linha.turno,
    prazoEm: linha.prazo_em,
    expiraEm: linha.expira_em,
    vencedorId: linha.vencedor_id,
    venci: linha.vencedor_id === usuarioId,
    motivoFim: linha.motivo_fim,
    estado: linha.estado,
    minhasRecompensas: linha.recompensas?.[usuarioId] ?? null,
    criadaEm: linha.criada_em,
    finalizadaEm: linha.finalizada_em,
  };
}

module.exports = { batalha };
