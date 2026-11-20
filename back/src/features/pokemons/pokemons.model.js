// Pokémon (os cards): acesso ao banco. Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

// Golpes especiais de um card (p), como JSON, na ordem do array pokemons.golpes
const SELECT_GOLPES = `(SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY array_position(p.golpes, g.id)), '[]'::jsonb)
     FROM golpes g WHERE g.id = ANY(p.golpes))`;

// Os campos de especies vêm depois de p.* e sobrescreveriam o "id" do card, então listamos só os necessários.
// ultimos_cuidados: { "carinho": <data do último>, ... }, para o front saber quando cada cuidado volta.
// golpes_detalhe: os golpes especiais do card, na ordem em que foram sorteados.
// Usado com "FROM pokemons p JOIN especies e ON e.id = p.especie_id"; a view (card) lê estes campos.
const CAMPOS_CARD = `p.*, e.nome, e.tipos, e.raridade, e.hp_base, e.ataque_base, e.defesa_base,
  e.velocidade_base, e.altura_base, e.peso_base, e.evolucoes,
  (SELECT jsonb_object_agg(c.tipo, c.ultimo)
     FROM (SELECT tipo, max(criado_em) AS ultimo FROM cuidados WHERE pokemon_id = p.id GROUP BY tipo) c
  ) AS ultimos_cuidados,
  EXISTS (SELECT 1 FROM anuncios WHERE pokemon_id = p.id AND status = 'ativo') AS anunciado,
  ${SELECT_GOLPES} AS golpes_detalhe`;

// Só o que o card público (cardPublico, na view) usa: sem cuidados, golpes nem anúncio.
// Usado pelo mercado, com o mesmo "FROM pokemons p JOIN especies e ON e.id = p.especie_id".
const CAMPOS_CARD_PUBLICO = `p.id, p.mint_numero, p.especie_id, p.shiny, p.nivel,
  p.iv_hp, p.iv_ataque, p.iv_defesa, p.iv_velocidade, p.mult_altura, p.mult_peso,
  p.bonus_hp, p.bonus_ataque, p.bonus_defesa, p.bonus_velocidade,
  e.nome, e.tipos, e.raridade, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base,
  e.altura_base, e.peso_base`;

/**
 * Cria o card. O mint_numero vem da sequence global no DEFAULT da coluna.
 * @returns {Promise<number>} id do card
 */
async function inserir(db, {
  donoId, especieId, origem, atributos: a, posicaoTime, nivel, golpes = [],
}) {
  const { rows: [{ id }] } = await db.query(
    `INSERT INTO pokemons (dono_id, especie_id, especie_original_id, origem, shiny,
                           iv_hp, iv_ataque, iv_defesa, iv_velocidade, mult_altura, mult_peso, posicao_time, nivel, golpes)
     VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [donoId, especieId, origem, a.shiny, a.iv_hp, a.iv_ataque, a.iv_defesa, a.iv_velocidade,
      a.mult_altura, a.mult_peso, posicaoTime, nivel, golpes],
  );
  return id;
}

/** Linha completa do card (CAMPOS_CARD), ou undefined */
async function buscarCard(db, pokemonId) {
  const { rows: [linha] } = await db.query(
    `SELECT ${CAMPOS_CARD} FROM pokemons p JOIN especies e ON e.id = p.especie_id WHERE p.id = $1`,
    [pokemonId],
  );
  return linha;
}

/** Cards do dono: primeiro o time (na ordem), depois o resto do mais novo para o mais antigo */
async function listarDoDono(db, donoId) {
  const { rows } = await db.query(
    `SELECT ${CAMPOS_CARD}
       FROM pokemons p JOIN especies e ON e.id = p.especie_id
      WHERE p.dono_id = $1
      ORDER BY p.posicao_time NULLS LAST, p.id DESC`,
    [donoId],
  );
  return rows;
}

/** Quantos desses Pokémon são do dono */
async function contarDoDono(db, pokemonIds, donoId) {
  const { rowCount } = await db.query('SELECT 1 FROM pokemons WHERE id = ANY($1) AND dono_id = $2', [pokemonIds, donoId]);
  return rowCount;
}

// Colunas de ordem do card. A coluna entra no SQL, então só nomes desta lista são aceitos.
const COLUNAS_DE_POSICAO = new Set(['posicao_time', 'posicao_vitrine']);

/** Grava a ordem recebida (posição 1, 2, 3...) na coluna escolhida (time ou vitrine) */
async function definirPosicoes(client, donoId, coluna, pokemonIds) {
  if (!COLUNAS_DE_POSICAO.has(coluna)) throw new Error(`Coluna de posição inválida: ${coluna}`);
  // Limpa antes de gravar para não esbarrar no UNIQUE (dono_id, coluna)
  await client.query(`UPDATE pokemons SET ${coluna} = NULL WHERE dono_id = $1`, [donoId]);
  for (const [i, id] of pokemonIds.entries()) {
    await client.query(`UPDATE pokemons SET ${coluna} = $2 WHERE id = $1`, [id, i + 1]);
  }
}

// Travar com JOIN (FOR UPDATE OF p) perde o card se outra transação mudar a espécie dele enquanto
// esperamos a trava: o Postgres reconfere o JOIN com o card novo e a espécie antiga, e a linha some.
// Por isso trava primeiro só pokemons e depois lê a espécie, já com a versão atual do card.

/** Trava e devolve os cards (que ainda são do dono) com o que o XP precisa */
async function travarParaXp(client, donoId, pokemonIds) {
  // Em ordem de id, para duas transações com os mesmos cards não se travarem
  await client.query('SELECT 1 FROM pokemons WHERE id = ANY($1) AND dono_id = $2 ORDER BY id FOR UPDATE', [pokemonIds, donoId]);
  const { rows } = await client.query(
    `SELECT p.id, p.mint_numero, p.nivel, p.xp, e.nome, e.evolucoes
       FROM pokemons p JOIN especies e ON e.id = p.especie_id
      WHERE p.id = ANY($1) AND p.dono_id = $2`,
    [pokemonIds, donoId],
  );
  return rows;
}

async function salvarNivel(db, pokemonId, { nivel, xp }) {
  await db.query('UPDATE pokemons SET nivel = $2, xp = $3 WHERE id = $1', [pokemonId, nivel, xp]);
}

/** Trava o card e devolve dono, nível e as evoluções da espécie atual */
async function travarParaEvolucao(client, pokemonId) {
  // Trava sem JOIN (ver o aviso acima de travarParaXp)
  await client.query('SELECT 1 FROM pokemons WHERE id = $1 FOR UPDATE', [pokemonId]);
  const { rows: [pokemon] } = await client.query(
    `SELECT p.dono_id, p.nivel, e.evolucoes
       FROM pokemons p JOIN especies e ON e.id = p.especie_id
      WHERE p.id = $1`,
    [pokemonId],
  );
  return pokemon;
}

/** Troca a espécie e soma o bônus sorteado da evolução */
async function evoluir(db, pokemonId, especieId, bonus) {
  await db.query(
    `UPDATE pokemons
        SET especie_id = $2, bonus_hp = bonus_hp + $3, bonus_ataque = bonus_ataque + $4,
            bonus_defesa = bonus_defesa + $5, bonus_velocidade = bonus_velocidade + $6
      WHERE id = $1`,
    [pokemonId, especieId, bonus.hp, bonus.ataque, bonus.defesa, bonus.velocidade],
  );
}

/** Trava o card e devolve o que o cuidado precisa (afeto, bem-estar e corações já pagos) */
async function travarParaCuidado(client, pokemonId) {
  const { rows: [pokemon] } = await client.query(
    `SELECT dono_id, afeto, humor, energia, bem_estar_em, coracoes_premiados
       FROM pokemons WHERE id = $1 FOR UPDATE`,
    [pokemonId],
  );
  return pokemon;
}

/** Data do último cuidado desse tipo no card (null se nunca teve) */
async function ultimoCuidado(db, pokemonId, tipo) {
  const { rows: [{ em }] } = await db.query(
    'SELECT max(criado_em) AS em FROM cuidados WHERE pokemon_id = $1 AND tipo = $2',
    [pokemonId, tipo],
  );
  return em;
}

/** Grava afeto, humor e energia e reinicia a contagem do desgaste em `agora` */
async function salvarBemEstar(db, pokemonId, {
  afeto, humor, energia, agora,
}) {
  await db.query(
    'UPDATE pokemons SET afeto = $2, humor = $3, energia = $4, bem_estar_em = $5 WHERE id = $1',
    [pokemonId, afeto, humor, energia, agora],
  );
}

async function inserirCuidado(db, pokemonId, tipo, afeto) {
  await db.query('INSERT INTO cuidados (pokemon_id, tipo, afeto) VALUES ($1, $2, $3)', [pokemonId, tipo, afeto]);
}

async function salvarCoracoesPremiados(db, pokemonId, coracoes) {
  await db.query('UPDATE pokemons SET coracoes_premiados = $2 WHERE id = $1', [pokemonId, coracoes]);
}

/** Últimos 10 cuidados do card, se ele for do dono */
async function listarCuidados(db, donoId, pokemonId) {
  const { rows } = await db.query(
    `SELECT c.tipo, c.afeto, c.criado_em AS "criadoEm"
       FROM cuidados c JOIN pokemons p ON p.id = c.pokemon_id
      WHERE c.pokemon_id = $1 AND p.dono_id = $2
      ORDER BY c.id DESC
      LIMIT 10`,
    [pokemonId, donoId],
  );
  return rows;
}

module.exports = {
  SELECT_GOLPES,
  CAMPOS_CARD,
  CAMPOS_CARD_PUBLICO,
  inserir,
  buscarCard,
  listarDoDono,
  contarDoDono,
  definirPosicoes,
  travarParaXp,
  salvarNivel,
  travarParaEvolucao,
  evoluir,
  travarParaCuidado,
  ultimoCuidado,
  salvarBemEstar,
  inserirCuidado,
  salvarCoracoesPremiados,
  listarCuidados,
};
