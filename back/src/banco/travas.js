// Travas de linha usadas por várias features para dois cliques não passarem juntos.
// Só funcionam com o client de uma transação: com o pool a trava acaba na hora.

/**
 * Trava os usuários até o fim da transação, sempre em ordem de id,
 * para duas operações cruzadas não se travarem
 * @param {import('pg').PoolClient} client
 * @param {number[]} ids
 */
async function travarUsuarios(client, ids) {
  await client.query('SELECT 1 FROM usuarios WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
}

/**
 * Trava a linha do usuário até o fim da transação
 * @param {import('pg').PoolClient} client
 * @param {number} usuarioId
 */
const travarUsuario = (client, usuarioId) => travarUsuarios(client, [usuarioId]);

module.exports = { travarUsuario, travarUsuarios };
