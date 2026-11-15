// Ajuda para buscas com ILIKE vindas do usuário

/**
 * Padrão de ILIKE para "começa com `busca`". Escapa \, % e _ para a busca ser literal:
 * sem isso, buscar "a_b" acharia "axb" e buscar "%" acharia todo mundo.
 * @param {string} busca
 */
const comecaCom = (busca) => `${busca.replace(/[\\%_]/g, '\\$&')}%`;

module.exports = { comecaCom };
