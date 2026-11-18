// Travas de linha usadas por várias features para dois cliques não passarem juntos.
// Só funcionam com o client de uma transação: com o pool a trava acaba na hora.
const { Pool } = require('pg');

/** Erro já no primeiro teste, em vez de uma condição de corrida silenciosa em produção */
function exigirTransacao(client) {
  if (client instanceof Pool) throw new Error('Trava chamada fora de uma transação (recebeu o pool).');
}

/**
 * Trava os usuários até o fim da transação, sempre em ordem de id,
 * para duas operações cruzadas não se travarem
 * @param {import('pg').PoolClient} client  client de uma transação aberta com transacao()
 * @param {number[]} ids
 */
async function travarUsuarios(client, ids) {
  exigirTransacao(client);
  await client.query('SELECT 1 FROM usuarios WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
}

/**
 * Trava a linha do usuário até o fim da transação
 * @param {import('pg').PoolClient} client
 * @param {number} usuarioId
 */
const travarUsuario = (client, usuarioId) => travarUsuarios(client, [usuarioId]);

module.exports = { travarUsuario, travarUsuarios };
