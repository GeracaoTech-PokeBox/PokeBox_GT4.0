// Carteira de Pokécoins: saldo em usuarios.pokecoins e o extrato em transacoes_pokecoins.
// Toda entrada ou saída de saldo deixa uma linha no extrato, na mesma transação.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/** @typedef {import('pg').Pool | import('pg').PoolClient} Db */

/**
 * Só a linha do extrato, para quando o saldo já foi alterado de outro jeito
 * (ex.: o cadastro, que já cria o usuário com o bônus).
 * @param {Db} db
 * @param {{ usuarioId: number, valor: number, motivo: string }} lancamento
 *   valor positivo = entrada, negativo = saída
 */
async function registrarNoExtrato(db, { usuarioId, valor, motivo }) {
  await db.query(
    'INSERT INTO transacoes_pokecoins (usuario_id, valor, motivo) VALUES ($1, $2, $3)',
    [usuarioId, valor, motivo],
  );
}

/** Saldo atual, ou undefined se o usuário não existe */
async function lerSaldo(db, usuarioId) {
  const { rows: [usuario] } = await db.query('SELECT pokecoins FROM usuarios WHERE id = $1', [usuarioId]);
  return usuario?.pokecoins;
}

/**
 * Soma `valor` ao saldo e registra no extrato.
 * @param {Db} db
 * @param {{ usuarioId: number, valor: number, motivo: string }} lancamento  valor positivo
 */
async function creditar(db, { usuarioId, valor, motivo }) {
  await db.query('UPDATE usuarios SET pokecoins = pokecoins + $2 WHERE id = $1', [usuarioId, valor]);
  await registrarNoExtrato(db, { usuarioId, valor, motivo });
}

/**
 * Débito condicional: se o saldo não cobre, nada muda e devolve undefined.
 * É atômico, então dois cliques rápidos não gastam o mesmo saldo duas vezes.
 * Com saldo, debita, registra no extrato (com valor negativo) e devolve o saldo novo.
 * @param {Db} db
 * @param {{ usuarioId: number, valor: number, motivo: string }} lancamento  valor positivo (quanto sai)
 * @returns {Promise<number | undefined>}
 */
async function debitar(db, { usuarioId, valor, motivo }) {
  const { rows: [usuario] } = await db.query(
    `UPDATE usuarios SET pokecoins = pokecoins - $2
      WHERE id = $1 AND pokecoins >= $2
      RETURNING pokecoins`,
    [usuarioId, valor],
  );
  if (!usuario) return undefined;
  await registrarNoExtrato(db, { usuarioId, valor: -valor, motivo });
  return usuario.pokecoins;
}

module.exports = {
  registrarNoExtrato, lerSaldo, creditar, debitar,
};
