// Golpes: acesso ao banco (cache de golpes, lista de movimentos da espécie e golpes do card). Só SQL.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/** Ids dos golpes que a espécie aprende, ou null se ainda não foram buscados */
async function lerMovimentos(db, especieId) {
  const { rows: [especie] } = await db.query('SELECT movimentos FROM especies WHERE id = $1', [especieId]);
  return especie?.movimentos ?? null;
}

async function salvarMovimentos(db, especieId, movimentos) {
  await db.query('UPDATE especies SET movimentos = $2 WHERE id = $1', [especieId, movimentos]);
}

async function buscarGolpe(db, id) {
  const { rows: [golpe] } = await db.query('SELECT * FROM golpes WHERE id = $1', [id]);
  return golpe;
}

/** Grava o golpe; se outra requisição gravou antes, não faz nada */
async function inserirGolpe(db, golpe) {
  await db.query(
    `INSERT INTO golpes (id, nome, tipo, classe, poder, precisao, pp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [golpe.id, golpe.nome, golpe.tipo, golpe.classe, golpe.poder, golpe.precisao, golpe.pp],
  );
}

/** O que a roleta precisa do card; com `travar`, trava a linha até o fim da transação */
async function buscarPokemon(db, pokemonId, { travar = false } = {}) {
  const { rows: [pokemon] } = await db.query(
    `SELECT dono_id, especie_id, afeto, golpes, golpes_desbloqueados FROM pokemons WHERE id = $1${travar ? ' FOR UPDATE' : ''}`,
    [pokemonId],
  );
  return pokemon;
}

/** Grava os golpes sorteados; `desbloquear` liga golpes_desbloqueados (nunca desliga) */
async function salvarGolpes(db, pokemonId, golpes, desbloquear) {
  await db.query(
    'UPDATE pokemons SET golpes = $2, golpes_desbloqueados = golpes_desbloqueados OR $3 WHERE id = $1',
    [pokemonId, golpes, desbloquear],
  );
}

/**
 * Cards sem nenhum golpe, ou com os `extras` golpes da roleta antiga (sem o inicial).
 * Um card que já roletou na regra antiga tem exatamente `extras` golpes.
 */
async function listarComGolpesFaltando(db, extras) {
  const { rows } = await db.query(
    `SELECT id, especie_id, golpes FROM pokemons
      WHERE cardinality(golpes) = 0 OR cardinality(golpes) = $1
      ORDER BY id`,
    [extras],
  );
  return rows;
}

/** Acrescenta golpes ao fim da lista, se ela ainda for a mesma (`atuais`); devolve se gravou */
async function acrescentarGolpes(db, pokemonId, atuais, novos) {
  const { rowCount } = await db.query(
    'UPDATE pokemons SET golpes = golpes || $3::int[] WHERE id = $1 AND golpes = $2::int[]',
    [pokemonId, atuais, novos],
  );
  return rowCount > 0;
}

module.exports = {
  listarComGolpesFaltando,
  acrescentarGolpes,
  lerMovimentos,
  salvarMovimentos,
  buscarGolpe,
  inserirGolpe,
  buscarPokemon,
  salvarGolpes,
};
