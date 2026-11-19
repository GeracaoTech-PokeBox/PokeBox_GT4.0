// Batalhas: acesso ao banco (batalhas, batalha_acoes e o que as recompensas consultam). Só SQL.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.
const { SELECT_GOLPES } = require('../pokemons');

// Consulta usada para devolver batalhas ao front, já com o login e a presença dos dois lados
const SELECT_BATALHA = `
  SELECT b.*, u1.login AS desafiante_login, u2.login AS desafiado_login,
         u1.online_em AS desafiante_online_em, u2.online_em AS desafiado_online_em
    FROM batalhas b
    JOIN usuarios u1 ON u1.id = b.desafiante_id
    JOIN usuarios u2 ON u2.id = b.desafiado_id`;

// ---------------------------------------------------------------------------
// Times e jogadores
// ---------------------------------------------------------------------------

/** Time de batalha do usuário, na ordem das posições, com os dados da espécie e os golpes especiais */
async function carregarTime(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT to_jsonb(p) AS pokemon, to_jsonb(e) AS especie, ${SELECT_GOLPES} AS golpes
       FROM pokemons p JOIN especies e ON e.id = p.especie_id
      WHERE p.dono_id = $1 AND p.posicao_time IS NOT NULL
      ORDER BY p.posicao_time`,
    [usuarioId],
  );
  return rows;
}

/** { id, login } de cada usuário */
async function buscarLogins(db, ids) {
  const { rows } = await db.query('SELECT id, login FROM usuarios WHERE id = ANY($1)', [ids]);
  return rows;
}

// ---------------------------------------------------------------------------
// Batalha
// ---------------------------------------------------------------------------

/** Linha de batalhas travada até o fim da transação, ou undefined */
async function travarBatalha(client, batalhaId) {
  const { rows: [batalha] } = await client.query('SELECT * FROM batalhas WHERE id = $1 FOR UPDATE', [batalhaId]);
  return batalha;
}

/** Como travarBatalha, mas pula (undefined) se outra transação já está com ela */
async function travarBatalhaSeLivre(client, batalhaId) {
  const { rows: [batalha] } = await client.query(
    'SELECT * FROM batalhas WHERE id = $1 FOR UPDATE SKIP LOCKED',
    [batalhaId],
  );
  return batalha;
}

/** Linha de SELECT_BATALHA, ou undefined */
async function buscarParaFront(db, batalhaId) {
  const { rows: [linha] } = await db.query(`${SELECT_BATALHA} WHERE b.id = $1`, [batalhaId]);
  return linha;
}

/** Desafios do desafiante ainda esperando resposta: no total e contra esse oponente */
async function contarDesafiosPendentes(db, desafianteId, desafiadoId, agora) {
  const { rows: [pendentes] } = await db.query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE $2 IN (desafiante_id, desafiado_id)) AS com_oponente
       FROM batalhas
      WHERE desafiante_id = $1 AND status = 'aguardando' AND expira_em > $3`,
    [desafianteId, desafiadoId, agora],
  );
  return pendentes;
}

/** @returns {Promise<number>} id da batalha */
async function inserirDesafio(db, { desafianteId, desafiadoId, expiraEm }) {
  const { rows: [{ id }] } = await db.query(
    'INSERT INTO batalhas (desafiante_id, desafiado_id, expira_em) VALUES ($1, $2, $3) RETURNING id',
    [desafianteId, desafiadoId, expiraEm],
  );
  return id;
}

/** Muda só o status ('expirada', 'recusada') */
async function mudarStatus(db, batalhaId, status) {
  await db.query('UPDATE batalhas SET status = $2 WHERE id = $1', [batalhaId, status]);
}

/** Começa a batalha com os times congelados no estado */
async function iniciar(db, batalhaId, {
  estado, vezDe, prazoEm, agora,
}) {
  await db.query(
    `UPDATE batalhas
        SET status = 'em_andamento', estado = $2, turno = 1, vez_de = $3,
            prazo_em = $4, ultimo_movimento_em = $5
      WHERE id = $1`,
    [batalhaId, estado, vezDe, prazoEm, agora],
  );
}

async function inserirAcao(db, {
  batalhaId, turno, jogadorId, tipo, automatica, eventos,
}) {
  await db.query(
    `INSERT INTO batalha_acoes (batalha_id, turno, jogador_id, tipo, automatica, eventos)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [batalhaId, turno, jogadorId, tipo, automatica, JSON.stringify(eventos)],
  );
}

/** Grava o estado depois de uma jogada e passa a vez (com prazo novo) */
async function avancarTurno(db, batalhaId, {
  estado, vezDe, prazoEm, agora,
}) {
  await db.query(
    `UPDATE batalhas
        SET estado = $2, turno = turno + 1, vez_de = $3, prazo_em = $4, ultimo_movimento_em = $5
      WHERE id = $1`,
    [batalhaId, estado, vezDe, prazoEm, agora],
  );
}

async function finalizar(db, batalhaId, {
  estado, vencedorId, motivo, agora,
}) {
  await db.query(
    `UPDATE batalhas
        SET status = 'finalizada', estado = $2, vencedor_id = $3, motivo_fim = $4,
            vez_de = NULL, prazo_em = NULL, ultimo_movimento_em = $5, finalizada_em = $5
      WHERE id = $1`,
    [batalhaId, estado, vencedorId, motivo, agora],
  );
}

async function salvarRecompensas(db, batalhaId, recompensas) {
  await db.query('UPDATE batalhas SET recompensas = $2 WHERE id = $1', [batalhaId, recompensas]);
}

/** Histórico de jogadas, na ordem */
async function listarAcoes(db, batalhaId) {
  const { rows } = await db.query(
    `SELECT turno, jogador_id AS "jogadorId", tipo, automatica, eventos, criada_em AS "criadaEm"
       FROM batalha_acoes WHERE batalha_id = $1 ORDER BY id`,
    [batalhaId],
  );
  return rows;
}

/** Pendentes e em andamento primeiro, depois as últimas 20 encerradas */
async function listarDoUsuario(db, usuarioId) {
  const { rows } = await db.query(
    `(${SELECT_BATALHA}
       WHERE $1 IN (b.desafiante_id, b.desafiado_id) AND b.status IN ('aguardando', 'em_andamento'))
     UNION ALL
     (${SELECT_BATALHA}
       WHERE $1 IN (b.desafiante_id, b.desafiado_id) AND b.status NOT IN ('aguardando', 'em_andamento')
       ORDER BY b.criada_em DESC LIMIT 20)`,
    [usuarioId],
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Prazos
// ---------------------------------------------------------------------------

/** Ids das batalhas do usuário com jogada ou desafio vencido */
async function idsVencidosDoUsuario(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT id FROM batalhas
      WHERE $1 IN (desafiante_id, desafiado_id)
        AND ((status = 'em_andamento' AND prazo_em <= now()) OR (status = 'aguardando' AND expira_em <= now()))`,
    [usuarioId],
  );
  return rows.map((r) => r.id);
}

/** Ids das batalhas em andamento com o prazo da jogada vencido, a mais atrasada primeiro */
async function idsComJogadaVencida(db, agora, limite) {
  const { rows } = await db.query(
    `SELECT id FROM batalhas
      WHERE status = 'em_andamento' AND prazo_em <= $1
      ORDER BY prazo_em
      LIMIT $2`,
    [agora, limite],
  );
  return rows.map((r) => r.id);
}

/** Expira todos os desafios vencidos; devolve quantos */
async function expirarDesafiosVencidos(db) {
  const { rowCount } = await db.query(
    "UPDATE batalhas SET status = 'expirada' WHERE status = 'aguardando' AND expira_em <= now()",
  );
  return rowCount;
}

// ---------------------------------------------------------------------------
// Recompensas
// ---------------------------------------------------------------------------

/** Jogadas feitas pelos jogadores (sem as automáticas e sem desistência) */
async function contarJogadasManuais(db, batalhaId) {
  const { rows: [{ total }] } = await db.query(
    `SELECT count(*) AS total FROM batalha_acoes
      WHERE batalha_id = $1 AND NOT automatica AND tipo IN ('atacar', 'golpe', 'trocar')`,
    [batalhaId],
  );
  return total;
}

/** Recompensas de batalha do usuário nas últimas 24h: no total e contra esse oponente */
async function contarRecompensasRecentes(db, usuarioId, oponenteId) {
  const { rows: [recentes] } = await db.query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE $2 IN (b.desafiante_id, b.desafiado_id)) AS contra_oponente
       FROM transacoes_pokecoins t JOIN batalhas b ON b.id = t.batalha_id
      WHERE t.usuario_id = $1 AND t.motivo = 'recompensa_batalha'
        AND t.criado_em > now() - interval '24 hours'`,
    [usuarioId, oponenteId],
  );
  return recentes;
}

module.exports = {
  carregarTime,
  buscarLogins,
  travarBatalha,
  travarBatalhaSeLivre,
  buscarParaFront,
  contarDesafiosPendentes,
  inserirDesafio,
  mudarStatus,
  iniciar,
  inserirAcao,
  avancarTurno,
  finalizar,
  salvarRecompensas,
  listarAcoes,
  listarDoUsuario,
  idsVencidosDoUsuario,
  idsComJogadaVencida,
  expirarDesafiosVencidos,
  contarJogadasManuais,
  contarRecompensasRecentes,
};
