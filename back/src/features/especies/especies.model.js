// Espécies: acesso ao banco (tabela especies, o cache local da Pokédex). Só SQL.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

async function buscarPorId(db, id) {
  const { rows: [especie] } = await db.query('SELECT * FROM especies WHERE id = $1', [id]);
  return especie;
}

/** Grava a espécie; se outra requisição gravou antes, não faz nada */
async function inserir(db, e) {
  // ON CONFLICT: duas pessoas podem mintar a mesma espécie nova ao mesmo tempo
  await db.query(
    `INSERT INTO especies (id, nome, tipos, raridade, taxa_captura, hp_base, ataque_base, defesa_base, velocidade_base,
                           altura_base, peso_base, evolucoes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO NOTHING`,
    [e.id, e.nome, e.tipos, e.raridade, e.taxa_captura, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base,
      e.altura_base, e.peso_base, JSON.stringify(e.evolucoes)],
  );
}

/** taxa_captura gravada (null nas espécies salvas antes da coluna existir; undefined se a espécie não está no banco) */
async function lerTaxaCaptura(db, id) {
  const { rows: [especie] } = await db.query('SELECT taxa_captura FROM especies WHERE id = $1', [id]);
  return especie?.taxa_captura;
}

async function salvarTaxaCaptura(db, id, taxaCaptura) {
  await db.query('UPDATE especies SET taxa_captura = $2 WHERE id = $1', [id, taxaCaptura]);
}

module.exports = {
  buscarPorId, inserir, lerTaxaCaptura, salvarTaxaCaptura,
};
