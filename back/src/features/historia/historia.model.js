// História: acesso ao banco (historia_encontros, mais o que a captura e a batalha leem). Só SQL.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

// Encontro + o que a tela e a batalha precisam da espécie
const SELECT_ENCONTRO = `
  SELECT h.*, e.nome, e.tipos, e.raridade, e.taxa_captura, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base
    FROM historia_encontros h JOIN especies e ON e.id = h.especie_id`;

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

async function buscarEncontro(db, encontroId) {
  const { rows: [encontro] } = await db.query(`${SELECT_ENCONTRO} WHERE h.id = $1`, [encontroId]);
  return encontro;
}

/** Encontro travado até o fim da transação, ou undefined */
async function travarEncontro(client, encontroId) {
  const { rows: [encontro] } = await client.query(`${SELECT_ENCONTRO} WHERE h.id = $1 FOR UPDATE OF h`, [encontroId]);
  return encontro;
}

/** O encontro do próximo ponto da trilha, se já foi explorado e ainda não foi vencido (ou null) */
async function encontroAberto(db, usuarioId) {
  const { rows: [encontro] } = await db.query(
    `${SELECT_ENCONTRO} WHERE h.usuario_id = $1 AND h.status = 'encontrado' AND NOT h.revanche`,
    [usuarioId],
  );
  return encontro ?? null;
}

/** Pontos da trilha já vencidos (sem contar revanches) */
async function contarVencidos(db, usuarioId) {
  const { rows: [{ total }] } = await db.query(
    "SELECT count(*) AS total FROM historia_encontros WHERE usuario_id = $1 AND status <> 'encontrado' AND NOT revanche",
    [usuarioId],
  );
  return total;
}

/** Último Pokémon encontrado num ponto (o que aparece na trilha), ou null */
async function ultimoDoPonto(db, usuarioId, trilha, ponto) {
  const { rows: [encontro] } = await db.query(
    `${SELECT_ENCONTRO} WHERE h.usuario_id = $1 AND h.trilha = $2 AND h.ponto = $3 ORDER BY h.id DESC LIMIT 1`,
    [usuarioId, trilha, ponto],
  );
  return encontro ?? null;
}

/** O último encontro de cada ponto, em ordem de trilha e ponto */
async function listarUltimosPorPonto(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (h.trilha, h.ponto)
            h.*, e.nome, e.tipos, e.raridade, e.taxa_captura, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base
       FROM historia_encontros h JOIN especies e ON e.id = h.especie_id
      WHERE h.usuario_id = $1
      ORDER BY h.trilha, h.ponto, h.id DESC`,
    [usuarioId],
  );
  return rows;
}

/** Pontos vencidos (sem revanches) e Pokémon capturados */
async function contarTotais(db, usuarioId) {
  const { rows: [totais] } = await db.query(
    `SELECT count(*) FILTER (WHERE status <> 'encontrado' AND NOT revanche) AS vencidos,
            count(*) FILTER (WHERE status = 'capturado') AS capturados
       FROM historia_encontros WHERE usuario_id = $1`,
    [usuarioId],
  );
  return totais;
}

/** Espécie do encontro, se ele for do usuário (undefined senão) */
async function especieDoEncontro(db, encontroId, usuarioId) {
  const { rows: [encontro] } = await db.query(
    'SELECT especie_id FROM historia_encontros WHERE id = $1 AND usuario_id = $2',
    [encontroId, usuarioId],
  );
  return encontro?.especie_id;
}

async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}

/** { id, login } do treinador, para o lado dele na batalha */
async function buscarTreinador(db, usuarioId) {
  const { rows: [usuario] } = await db.query('SELECT id, login FROM usuarios WHERE id = $1', [usuarioId]);
  return usuario;
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

/** Grava o Pokémon selvagem sorteado num ponto; devolve o id */
async function inserirEncontro(db, {
  usuarioId, trilha, ponto, especieId, forca, nivel, atributos: a, revanche,
}) {
  const { rows: [{ id }] } = await db.query(
    `INSERT INTO historia_encontros (usuario_id, trilha, ponto, especie_id, forca, nivel, shiny,
                                     iv_hp, iv_ataque, iv_defesa, iv_velocidade, mult_altura, mult_peso, revanche)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [usuarioId, trilha, ponto, especieId, forca, nivel, a.shiny,
      a.iv_hp, a.iv_ataque, a.iv_defesa, a.iv_velocidade, a.mult_altura, a.mult_peso, revanche],
  );
  return id;
}

/** Batalha continua: grava estado e log */
async function salvarBatalha(db, encontroId, { estado, logJson }) {
  await db.query('UPDATE historia_encontros SET estado = $2, log = $3 WHERE id = $1', [encontroId, estado, logJson]);
}

/** Vitória: o ponto fica vencido (na primeira vez) e a batalha sai do encontro */
async function registrarVitoria(db, encontroId, { logJson, recompensa }) {
  await db.query(
    `UPDATE historia_encontros
        SET status = CASE WHEN status = 'encontrado' THEN 'vencido' ELSE status END,
            vencido_em = COALESCE(vencido_em, now()),
            estado = NULL, log = $2, recompensa = $3
      WHERE id = $1`,
    [encontroId, logJson, recompensa],
  );
}

/** Derrota ou fuga: a batalha sai do encontro; numa revanche o selvagem foge */
async function registrarDerrota(db, encontroId, { logJson }) {
  await db.query(
    `UPDATE historia_encontros
        SET estado = NULL, log = $2, status = CASE WHEN revanche THEN 'fugiu' ELSE status END
      WHERE id = $1`,
    [encontroId, logJson],
  );
}

/** Gasta uma Pokébola se tiver; devolve quantas sobraram, ou undefined se não tinha nenhuma */
async function gastarPokebola(db, usuarioId) {
  const { rows: [usuario] } = await db.query(
    'UPDATE usuarios SET pokebolas = pokebolas - 1 WHERE id = $1 AND pokebolas > 0 RETURNING pokebolas',
    [usuarioId],
  );
  return usuario?.pokebolas;
}

async function salvarTentativaCaptura(db, encontroId, { tentativas, status, pokemonId }) {
  await db.query(
    'UPDATE historia_encontros SET tentativas_captura = $2, status = $3, pokemon_id = $4 WHERE id = $1',
    [encontroId, tentativas, status, pokemonId],
  );
}

async function ignorar(db, encontroId) {
  await db.query("UPDATE historia_encontros SET status = 'ignorado' WHERE id = $1", [encontroId]);
}

module.exports = {
  buscarEncontro,
  travarEncontro,
  encontroAberto,
  contarVencidos,
  ultimoDoPonto,
  listarUltimosPorPonto,
  contarTotais,
  especieDoEncontro,
  travarUsuario,
  buscarTreinador,
  inserirEncontro,
  salvarBatalha,
  registrarVitoria,
  registrarDerrota,
  gastarPokebola,
  salvarTentativaCaptura,
  ignorar,
};
