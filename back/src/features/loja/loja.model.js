// Loja: acesso ao banco. Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/** Trava a linha do usuário até o fim da transação (dois cliques não passam juntos) */
async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}

async function temAlgumPokemon(db, usuarioId) {
  const { rowCount } = await db.query('SELECT 1 FROM pokemons WHERE dono_id = $1 LIMIT 1', [usuarioId]);
  return rowCount > 0;
}

/** Saldo atual, ou undefined se o usuário não existe */
async function lerPokecoins(db, usuarioId) {
  const { rows: [usuario] } = await db.query('SELECT pokecoins FROM usuarios WHERE id = $1', [usuarioId]);
  return usuario?.pokecoins;
}

/**
 * Débito condicional: se o saldo não cobre, nenhuma linha é alterada e devolve undefined.
 * É atômico, então dois cliques rápidos não gastam o mesmo saldo duas vezes.
 * @returns {Promise<number | undefined>} saldo depois do débito
 */
async function debitarPokecoins(db, usuarioId, valor) {
  const { rows: [usuario] } = await db.query(
    `UPDATE usuarios SET pokecoins = pokecoins - $2
      WHERE id = $1 AND pokecoins >= $2
      RETURNING pokecoins`,
    [usuarioId, valor],
  );
  return usuario?.pokecoins;
}

/**
 * Troca Pokécoins por Pokébolas com o mesmo débito condicional de debitarPokecoins.
 * @returns {Promise<{ pokecoins: number, pokebolas: number } | undefined>}
 */
async function trocarPorPokebolas(db, usuarioId, { custo, quantidade }) {
  const { rows: [usuario] } = await db.query(
    `UPDATE usuarios SET pokecoins = pokecoins - $2, pokebolas = pokebolas + $3
      WHERE id = $1 AND pokecoins >= $2
      RETURNING pokecoins, pokebolas`,
    [usuarioId, custo, quantidade],
  );
  return usuario;
}

/** Primeira posição livre do time (1 a tamanhoTime), ou null se o time está cheio */
async function primeiraVagaNoTime(db, usuarioId, tamanhoTime) {
  const { rows: [{ posicao }] } = await db.query(
    `SELECT MIN(pos) AS posicao
       FROM generate_series(1, $2::int) AS pos
      WHERE pos NOT IN (SELECT posicao_time FROM pokemons WHERE dono_id = $1 AND posicao_time IS NOT NULL)`,
    [usuarioId, tamanhoTime],
  );
  return posicao;
}

module.exports = {
  travarUsuario,
  temAlgumPokemon,
  lerPokecoins,
  debitarPokecoins,
  trocarPorPokebolas,
  primeiraVagaNoTime,
};
