// Notificações: o que mudou em cada aba e o treinador ainda não viu. As outras features chamam
// notificar() dentro das próprias transações (proposta recebida, desafio, visita na vitrine...).
// Ver uma notificação dá RECOMPENSA_NOTIFICACAO Pokécoins, até RECOMPENSAS_NOTIFICACAO_POR_DIA por dia.
const { pool, transacao } = require('../../banco/db');
const carteira = require('../../banco/carteira');
const { travarUsuario } = require('../../banco/travas');
const config = require('../../compartilhado/config');
const { NaoEncontrado } = require('../../compartilhado/erros');
const model = require('./notificacoes.model');

/** As abas do menu do front (o mesmo nome das telas) */
const ABAS = ['pokemons', 'meusPokemons', 'loja', 'time', 'historia', 'vitrine', 'trocas', 'batalhas', 'sobre'];

/**
 * Avisa o usuário de algo novo numa aba. Chame com o client da transação que causou o aviso,
 * para ele só existir se a operação for gravada.
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {{ usuarioId: number, aba: string, chave: string, titulo: string, texto: string }} notificacao
 *   chave: o mesmo assunto pendente não repete, só soma na quantidade (ex.: `proposta:12`, `visitas`)
 */
async function notificar(db, notificacao) {
  if (!ABAS.includes(notificacao.aba)) throw new Error(`Aba de notificação inválida: ${notificacao.aba}`);
  await model.inserir(db, notificacao);
}

/** Nome da espécie como o front mostra: 'mr-mime' -> 'Mr Mime' */
const nomePokemon = (nome) => nome.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

const recompensasRestantes = (usadas) => Math.max(config.RECOMPENSAS_NOTIFICACAO_POR_DIA - usadas, 0);

/** Pendentes, a contagem por aba e quantas recompensas ainda dá para ganhar hoje */
async function listar(usuarioId) {
  const [linhas, usadas] = await Promise.all([
    model.listarPendentes(pool, usuarioId),
    model.contarRecompensasHoje(pool, usuarioId),
  ]);
  const porAba = {};
  for (const linha of linhas) porAba[linha.aba] = (porAba[linha.aba] ?? 0) + 1;
  return {
    notificacoes: linhas.map((l) => ({
      id: Number(l.id), aba: l.aba, titulo: l.titulo, texto: l.texto, quantidade: l.quantidade, criadaEm: l.criada_em,
    })),
    porAba,
    recompensa: config.RECOMPENSA_NOTIFICACAO,
    recompensasRestantesHoje: recompensasRestantes(usadas),
  };
}

/**
 * Marca a notificação como vista e paga a recompensa, se ainda houver no limite do dia.
 * O usuário fica travado para dois cliques (ou duas abas) não passarem juntos pelo limite.
 */
async function ver(usuarioId, notificacaoId) {
  return transacao(async (client) => {
    await travarUsuario(client, usuarioId);
    const usadas = await model.contarRecompensasHoje(client, usuarioId);
    const pokecoins = recompensasRestantes(usadas) > 0 ? config.RECOMPENSA_NOTIFICACAO : 0;

    const vista = await model.marcarVista(client, usuarioId, notificacaoId, pokecoins);
    if (!vista) throw new NaoEncontrado('Notificação não encontrada ou já vista.');
    if (pokecoins > 0) {
      await carteira.creditar(client, { usuarioId, valor: pokecoins, motivo: 'recompensa_notificacao' });
    }
    return {
      pokecoins,
      saldo: await carteira.lerSaldo(client, usuarioId),
      recompensasRestantesHoje: recompensasRestantes(usadas + (pokecoins > 0 ? 1 : 0)),
    };
  });
}

module.exports = {
  ABAS, notificar, nomePokemon, listar, ver,
};
