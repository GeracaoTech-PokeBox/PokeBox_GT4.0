// Ajuda para buscas com ILIKE vindas do usuário

/**
 * Padrão de ILIKE para "começa com `busca`". Escapa \, % e _ para a busca ser literal:
 * sem isso, buscar "a_b" acharia "axb" e buscar "%" acharia todo mundo.
 * @param {string} busca
 */
const escapar = (busca) => busca.replace(/[\\%_]/g, '\\$&');

const comecaCom = (busca) => `${escapar(busca)}%`;

/** Padrão de ILIKE para "contém `busca`", com o mesmo escape de comecaCom */
const contem = (busca) => `%${escapar(busca)}%`;

module.exports = { comecaCom, contem };
