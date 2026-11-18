// Trocas: acesso ao banco (anuncios, propostas, proposta_pokemons e a posse dos cards). Só SQL.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.
const { contem } = require('../../banco/busca');
const { CAMPOS_CARD } = require('../pokemons');

// Ordenações aceitas (a chave vem da query string; o valor é SQL, então nunca vem do usuário)
const ORDENS_MERCADO = {
  popularidade: 'anuncios DESC, e.nome',
  preco: '"menorPreco" ASC NULLS LAST, e.nome',
  nome: 'e.nome',
};

const ORDENS_ANUNCIOS = {
  preco: 'a.preco ASC NULLS LAST, a.id',
  nivel: 'p.nivel DESC, a.id',
  ivs: '(p.iv_hp + p.iv_ataque + p.iv_defesa + p.iv_velocidade) DESC, a.id',
  recentes: 'a.id DESC',
};

// Anúncio + card completo + quem anunciou + quantas propostas esperam resposta
const SELECT_ANUNCIO = `
  SELECT ${CAMPOS_CARD}, a.id AS anuncio_id, a.preco, a.aceita_propostas, a.criado_em AS anunciado_em,
         a.vendedor_id, u.login AS vendedor_login,
         (SELECT count(*) FROM propostas WHERE anuncio_id = a.id AND status = 'pendente') AS propostas_pendentes
    FROM anuncios a
    JOIN pokemons p ON p.id = a.pokemon_id
    JOIN especies e ON e.id = p.especie_id
    JOIN usuarios u ON u.id = a.vendedor_id`;

// Resumo de um card para os cards de proposta (foto, nome, nível, IVs)
const RESUMO_CARD = (p, e) => `jsonb_build_object(
  'id', ${p}.id, 'mintNumero', ${p}.mint_numero, 'especieId', ${p}.especie_id, 'nome', ${e}.nome,
  'shiny', ${p}.shiny, 'nivel', ${p}.nivel, 'tipos', ${e}.tipos,
  'ivTotal', ${p}.iv_hp + ${p}.iv_ataque + ${p}.iv_defesa + ${p}.iv_velocidade)`;

// ---------------------------------------------------------------------------
// Consultas do mercado
// ---------------------------------------------------------------------------

/** Espécies com anúncios ativos cujo nome contém `busca` */
async function listarMercado(db, busca, ordem) {
  const { rows } = await db.query(
    `SELECT e.id AS "especieId", e.nome, e.tipos,
            count(*) AS anuncios,
            min(a.preco) AS "menorPreco",
            count(*) FILTER (WHERE a.aceita_propostas) AS "aceitamPropostas",
            count(*) FILTER (WHERE p.shiny) AS shinies
       FROM anuncios a
       JOIN pokemons p ON p.id = a.pokemon_id
       JOIN especies e ON e.id = p.especie_id
      WHERE a.status = 'ativo' AND e.nome ILIKE $1
      GROUP BY e.id
      ORDER BY ${ORDENS_MERCADO[ordem] ?? ORDENS_MERCADO.popularidade}
      LIMIT 120`,
    [contem(busca)],
  );
  return rows;
}

async function listarAnunciosDaEspecie(db, especieId, ordem) {
  const { rows } = await db.query(
    `${SELECT_ANUNCIO}
      WHERE a.status = 'ativo' AND p.especie_id = $1
      ORDER BY ${ORDENS_ANUNCIOS[ordem] ?? ORDENS_ANUNCIOS.preco}
      LIMIT 100`,
    [especieId],
  );
  return rows;
}

async function listarAnunciosAtivosDoVendedor(db, vendedorId) {
  const { rows } = await db.query(
    `${SELECT_ANUNCIO} WHERE a.status = 'ativo' AND a.vendedor_id = $1 ORDER BY a.id DESC`,
    [vendedorId],
  );
  return rows;
}

async function buscarAnuncioCompleto(db, anuncioId) {
  const { rows: [linha] } = await db.query(`${SELECT_ANUNCIO} WHERE a.id = $1`, [anuncioId]);
  return linha;
}

// ---------------------------------------------------------------------------
// Travas e posse dos cards
// ---------------------------------------------------------------------------

/** Linha de anuncios, ou undefined */
async function lerAnuncio(db, anuncioId, { travar = false } = {}) {
  const { rows: [anuncio] } = await db.query(
    `SELECT * FROM anuncios WHERE id = $1${travar ? ' FOR UPDATE' : ''}`,
    [anuncioId],
  );
  return anuncio;
}

/** Trava os cards (em ordem de id) e devolve dono e posição no time de cada um */
async function travarCards(client, pokemonIds) {
  const { rows } = await client.query(
    'SELECT id, dono_id, posicao_time FROM pokemons WHERE id = ANY($1) ORDER BY id FOR UPDATE',
    [pokemonIds],
  );
  return rows;
}

/**
 * Passa os cards para o novo dono. O afeto é com o treinador, então zera (e o histórico de
 * cuidados vai junto). Anúncios e propostas pendentes que envolviam esses cards são encerrados.
 */
async function transferirCards(client, pokemonIds, novoDonoId) {
  await client.query(
    'UPDATE pokemons SET dono_id = $2, posicao_time = NULL, posicao_vitrine = NULL, afeto = 0 WHERE id = ANY($1)',
    [pokemonIds, novoDonoId],
  );
  await client.query('DELETE FROM cuidados WHERE pokemon_id = ANY($1)', [pokemonIds]);
  await client.query(
    "UPDATE anuncios SET status = 'cancelado', finalizado_em = now() WHERE pokemon_id = ANY($1) AND status = 'ativo'",
    [pokemonIds],
  );
  await client.query(
    `UPDATE propostas SET status = 'encerrada', respondida_em = now()
      WHERE status = 'pendente'
        AND (anuncio_id IN (SELECT id FROM anuncios WHERE pokemon_id = ANY($1))
             OR EXISTS (SELECT 1 FROM proposta_pokemons pp
                         WHERE pp.proposta_id = propostas.id AND pp.pokemon_id = ANY($1)))`,
    [pokemonIds],
  );
}

// ---------------------------------------------------------------------------
// Anúncios
// ---------------------------------------------------------------------------

/** Quantos anúncios ativos o usuário tem e se esse Pokémon já está anunciado */
async function contarAnunciosAtivos(db, usuarioId, pokemonId) {
  const { rows: [{ ativos, jaAnunciado }] } = await db.query(
    `SELECT count(*) FILTER (WHERE vendedor_id = $1) AS ativos,
            bool_or(pokemon_id = $2) AS "jaAnunciado"
       FROM anuncios WHERE status = 'ativo' AND (vendedor_id = $1 OR pokemon_id = $2)`,
    [usuarioId, pokemonId],
  );
  return { ativos, jaAnunciado };
}

/** @returns {Promise<number>} id do anúncio */
async function inserirAnuncio(db, {
  pokemonId, vendedorId, preco, aceitaPropostas,
}) {
  const { rows: [{ id }] } = await db.query(
    `INSERT INTO anuncios (pokemon_id, vendedor_id, preco, aceita_propostas)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [pokemonId, vendedorId, preco, aceitaPropostas],
  );
  return id;
}

async function cancelarAnuncio(db, anuncioId) {
  await db.query("UPDATE anuncios SET status = 'cancelado', finalizado_em = now() WHERE id = $1", [anuncioId]);
}

/** Fecha o anúncio como 'vendido' ou 'trocado', anotando quem levou */
async function fecharAnuncio(db, anuncioId, { status, compradorId }) {
  await db.query(
    'UPDATE anuncios SET status = $2, comprador_id = $3, finalizado_em = now() WHERE id = $1',
    [anuncioId, status, compradorId],
  );
}

// ---------------------------------------------------------------------------
// Propostas
// ---------------------------------------------------------------------------

async function encerrarPropostasDoAnuncio(db, anuncioId) {
  await db.query(
    "UPDATE propostas SET status = 'encerrada', respondida_em = now() WHERE anuncio_id = $1 AND status = 'pendente'",
    [anuncioId],
  );
}

/** Propostas pendentes do usuário: no total e neste anúncio */
async function contarPropostasPendentes(db, usuarioId, anuncioId) {
  const { rows: [pendentes] } = await db.query(
    `SELECT count(*) AS total, count(*) FILTER (WHERE anuncio_id = $2) AS neste
       FROM propostas WHERE proponente_id = $1 AND status = 'pendente'`,
    [usuarioId, anuncioId],
  );
  return pendentes;
}

/** Cria a proposta com os Pokémon oferecidos; devolve o id */
async function inserirProposta(client, {
  anuncioId, proponenteId, pokecoins, pokemonIds,
}) {
  const { rows: [{ id }] } = await client.query(
    'INSERT INTO propostas (anuncio_id, proponente_id, pokecoins) VALUES ($1, $2, $3) RETURNING id',
    [anuncioId, proponenteId, pokecoins],
  );
  for (const pokemonId of pokemonIds) {
    await client.query('INSERT INTO proposta_pokemons (proposta_id, pokemon_id) VALUES ($1, $2)', [id, pokemonId]);
  }
  return id;
}

/** Propostas em que o usuário é vendedor ou proponente: pendentes primeiro, depois as mais recentes */
async function listarPropostas(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT pr.id, pr.status, pr.pokecoins, pr.criada_em AS "criadaEm", pr.respondida_em AS "respondidaEm",
            a.id AS "anuncioId", a.preco, a.vendedor_id, pr.proponente_id,
            uv.login AS vendedor, up.login AS proponente,
            ${RESUMO_CARD('pa', 'ea')} AS alvo,
            (SELECT coalesce(jsonb_agg(${RESUMO_CARD('po', 'eo')} ORDER BY po.id), '[]')
               FROM proposta_pokemons pp
               JOIN pokemons po ON po.id = pp.pokemon_id
               JOIN especies eo ON eo.id = po.especie_id
              WHERE pp.proposta_id = pr.id) AS oferta
       FROM propostas pr
       JOIN anuncios a ON a.id = pr.anuncio_id
       JOIN pokemons pa ON pa.id = a.pokemon_id
       JOIN especies ea ON ea.id = pa.especie_id
       JOIN usuarios uv ON uv.id = a.vendedor_id
       JOIN usuarios up ON up.id = pr.proponente_id
      WHERE a.vendedor_id = $1 OR pr.proponente_id = $1
      ORDER BY (pr.status = 'pendente') DESC, pr.id DESC
      LIMIT 60`,
    [usuarioId],
  );
  return rows;
}

/** Proposta com o vendedor do anúncio, ou undefined */
async function lerProposta(db, propostaId) {
  const { rows: [proposta] } = await db.query(
    'SELECT pr.*, a.vendedor_id FROM propostas pr JOIN anuncios a ON a.id = pr.anuncio_id WHERE pr.id = $1',
    [propostaId],
  );
  return proposta;
}

async function travarProposta(client, propostaId) {
  const { rows: [proposta] } = await client.query('SELECT * FROM propostas WHERE id = $1 FOR UPDATE', [propostaId]);
  return proposta;
}

/** Ids dos Pokémon oferecidos na proposta */
async function pokemonsDaProposta(db, propostaId) {
  const { rows } = await db.query('SELECT pokemon_id FROM proposta_pokemons WHERE proposta_id = $1', [propostaId]);
  return rows.map((r) => r.pokemon_id);
}

/** Marca a resposta: 'aceita', 'recusada' ou 'cancelada' */
async function responderProposta(db, propostaId, status) {
  await db.query('UPDATE propostas SET status = $2, respondida_em = now() WHERE id = $1', [propostaId, status]);
}

module.exports = {
  ORDENS_MERCADO,
  ORDENS_ANUNCIOS,
  listarMercado,
  listarAnunciosDaEspecie,
  listarAnunciosAtivosDoVendedor,
  buscarAnuncioCompleto,
  lerAnuncio,
  travarCards,
  transferirCards,
  contarAnunciosAtivos,
  inserirAnuncio,
  cancelarAnuncio,
  fecharAnuncio,
  encerrarPropostasDoAnuncio,
  contarPropostasPendentes,
  inserirProposta,
  listarPropostas,
  lerProposta,
  travarProposta,
  pokemonsDaProposta,
  responderProposta,
};
