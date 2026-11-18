// Carteira de Pokécoins: saldo em usuarios.pokecoins e o extrato em transacoes_pokecoins.
// Toda entrada ou saída de saldo deixa uma linha no extrato, na mesma transação.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/** @typedef {import('pg').Pool | import('pg').PoolClient} Db */

/**
 * @typedef {object} Lancamento
 * @property {number} usuarioId
 * @property {number} valor
 * @property {string} motivo     um dos motivos aceitos pelo CHECK da tabela
 * @property {number | null} [anuncioId]  compras e trocas do mercado
 * @property {number | null} [batalhaId]  recompensas de batalha
 */

/**
 * Só a linha do extrato, para quando o saldo já foi alterado de outro jeito
 * (ex.: o cadastro, que já cria o usuário com o bônus).
 * @param {Db} db
 * @param {Lancamento} lancamento  valor positivo = entrada, negativo = saída
 */
async function registrarNoExtrato(db, {
  usuarioId, valor, motivo, anuncioId = null, batalhaId = null,
}) {
  await db.query(
    `INSERT INTO transacoes_pokecoins (usuario_id, valor, motivo, anuncio_id, batalha_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, valor, motivo, anuncioId, batalhaId],
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
 * @param {Lancamento} lancamento  valor positivo
 */
async function creditar(db, lancamento) {
  await db.query('UPDATE usuarios SET pokecoins = pokecoins + $2 WHERE id = $1', [lancamento.usuarioId, lancamento.valor]);
  await registrarNoExtrato(db, lancamento);
}

/**
 * Débito condicional: se o saldo não cobre, nada muda e devolve undefined.
 * É atômico, então dois cliques rápidos não gastam o mesmo saldo duas vezes.
 * Com saldo, debita, registra no extrato (com valor negativo) e devolve o saldo novo.
 * @param {Db} db
 * @param {Lancamento} lancamento  valor positivo (quanto sai)
 * @returns {Promise<number | undefined>}
 */
async function debitar(db, lancamento) {
  const { rows: [usuario] } = await db.query(
    `UPDATE usuarios SET pokecoins = pokecoins - $2
      WHERE id = $1 AND pokecoins >= $2
      RETURNING pokecoins`,
    [lancamento.usuarioId, lancamento.valor],
  );
  if (!usuario) return undefined;
  await registrarNoExtrato(db, { ...lancamento, valor: -lancamento.valor });
  return usuario.pokecoins;
}

module.exports = {
  registrarNoExtrato, lerSaldo, creditar, debitar,
};
