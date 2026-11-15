// Extrato de Pokécoins (tabela transacoes_pokecoins): toda entrada ou saída de saldo deixa uma linha aqui.
// Quem altera usuarios.pokecoins grava o extrato na mesma transação.

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {{ usuarioId: number, valor: number, motivo: string }} lancamento
 *   valor positivo = entrada, negativo = saída
 */
async function registrarNoExtrato(db, { usuarioId, valor, motivo }) {
  await db.query(
    'INSERT INTO transacoes_pokecoins (usuario_id, valor, motivo) VALUES ($1, $2, $3)',
    [usuarioId, valor, motivo],
  );
}

module.exports = { registrarNoExtrato };
