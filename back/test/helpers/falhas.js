// Falha forçada no meio de uma operação, para provar que a transação desfaz tudo.
// É um trigger do próprio Postgres que dá erro quando a tabela é tocada: o código do jogo
// roda igual ao de produção até esse ponto, e o que ele já tinha gravado precisa sumir.

/**
 * Faz o banco dar erro no próximo comando que bater no trigger. Devolve a função que remove o trigger.
 * @param {import('pg').Pool} pool
 * @param {{ tabela: string, evento?: 'INSERT' | 'UPDATE' | 'DELETE', nivel?: 'ROW' | 'STATEMENT', quando?: string }} alvo
 *   quando: condição SQL do trigger (ex.: "NEW.motivo = 'recompensa_batalha'"), só para nível ROW
 * @returns {Promise<() => Promise<void>>}
 */
async function injetarFalha(pool, { tabela, evento = 'INSERT', nivel = 'ROW', quando }) {
  await pool.query(`CREATE OR REPLACE FUNCTION teste_falha() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'falha injetada pelo teste'; END $$`);
  await pool.query(`CREATE TRIGGER teste_falha BEFORE ${evento} ON ${tabela}
    FOR EACH ${nivel} ${quando ? `WHEN (${quando})` : ''} EXECUTE FUNCTION teste_falha()`);
  return async () => {
    await pool.query(`DROP TRIGGER IF EXISTS teste_falha ON ${tabela}`);
  };
}

module.exports = { injetarFalha };
