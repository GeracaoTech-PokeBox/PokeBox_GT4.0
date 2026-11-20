// Notificações: acesso ao banco. Só SQL.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/**
 * Cria a notificação; se já existe uma pendente com a mesma chave, só soma 1 na quantidade e
 * atualiza o texto e a data (ex.: várias visitas na vitrine viram uma notificação só).
 */
async function inserir(db, {
  usuarioId, aba, chave, titulo, texto,
}) {
  await db.query(
    `INSERT INTO notificacoes (usuario_id, aba, chave, titulo, texto)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id, chave) WHERE vista_em IS NULL
     DO UPDATE SET quantidade = notificacoes.quantidade + 1, titulo = EXCLUDED.titulo,
                   texto = EXCLUDED.texto, criada_em = now()`,
    [usuarioId, aba, chave, titulo, texto],
  );
}

/** Pendentes do usuário, da mais nova para a mais antiga */
async function listarPendentes(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT id, aba, titulo, texto, quantidade, criada_em
       FROM notificacoes
      WHERE usuario_id = $1 AND vista_em IS NULL
      ORDER BY criada_em DESC, id DESC
      LIMIT 200`,
    [usuarioId],
  );
  return rows;
}

/** Quantas notificações já deram recompensa hoje (dia do servidor do banco) */
async function contarRecompensasHoje(db, usuarioId) {
  const { rows: [{ total }] } = await db.query(
    `SELECT count(*)::int AS total FROM notificacoes
      WHERE usuario_id = $1 AND recompensa > 0 AND vista_em >= date_trunc('day', now())`,
    [usuarioId],
  );
  return total;
}

/** Marca como vista se ainda está pendente e é do usuário; devolve a linha, ou undefined */
async function marcarVista(db, usuarioId, notificacaoId, recompensa) {
  const { rows: [linha] } = await db.query(
    `UPDATE notificacoes SET vista_em = now(), recompensa = $3
      WHERE id = $2 AND usuario_id = $1 AND vista_em IS NULL
      RETURNING id, aba`,
    [usuarioId, notificacaoId, recompensa],
  );
  return linha;
}

module.exports = {
  inserir, listarPendentes, contarRecompensasHoje, marcarVista,
};
