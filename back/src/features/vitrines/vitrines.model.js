// Vitrines: acesso ao banco. Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.
const { comecaCom } = require('../../banco/busca');

/** @typedef {import('pg').Pool | import('pg').PoolClient} Db */

/** Dono da vitrine pelo login, sem diferenciar maiúsculas */
async function buscarDonoPorLogin(db, login) {
  const { rows: [dono] } = await db.query(
    'SELECT id, login, criado_em FROM usuarios WHERE lower(login) = lower($1)',
    [login],
  );
  return dono;
}

/** Linha da vitrine, ou undefined se o treinador nunca salvou nem recebeu visita */
async function lerVitrine(db, usuarioId) {
  const { rows: [vitrine] } = await db.query(
    'SELECT bio, estilo, visitas FROM vitrines WHERE usuario_id = $1',
    [usuarioId],
  );
  return vitrine;
}

/** Soma uma visita (criando a linha na primeira) e devolve a vitrine atualizada */
async function registrarVisita(db, usuarioId) {
  const { rows: [vitrine] } = await db.query(
    `INSERT INTO vitrines (usuario_id, visitas) VALUES ($1, 1)
     ON CONFLICT (usuario_id) DO UPDATE SET visitas = vitrines.visitas + 1
     RETURNING bio, estilo, visitas`,
    [usuarioId],
  );
  return vitrine;
}

/** Totais da coleção e a média de afeto do time */
async function contarColecao(db, donoId) {
  const { rows: [numeros] } = await db.query(
    `SELECT count(*) AS pokemons,
            count(DISTINCT especie_id) AS especies,
            count(*) FILTER (WHERE shiny) AS shinies,
            avg(afeto) FILTER (WHERE posicao_time IS NOT NULL) AS afeto_time
       FROM pokemons WHERE dono_id = $1`,
    [donoId],
  );
  return numeros;
}

/** Espécies que o treinador tem hoje (para o álbum), marcando se alguma é shiny */
async function listarEspecies(db, donoId) {
  const { rows } = await db.query(
    `SELECT especie_id AS id, bool_or(shiny) AS shiny
       FROM pokemons WHERE dono_id = $1
      GROUP BY especie_id ORDER BY especie_id`,
    [donoId],
  );
  return rows;
}

async function contarVitorias(db, donoId) {
  const { rows: [{ vitorias }] } = await db.query(
    'SELECT count(*) AS vitorias FROM batalhas WHERE vencedor_id = $1',
    [donoId],
  );
  return vitorias;
}

/**
 * Pokémon em destaque, na ordem escolhida. Quem ainda não escolheu destaques
 * mostra o time de batalha, para a vitrine nunca começar vazia.
 */
async function buscarDestaques(db, donoId) {
  const { rows } = await db.query(
    `SELECT p.id, p.mint_numero, p.especie_id, p.shiny, p.nivel, p.afeto, e.nome, e.tipos, e.raridade
       FROM pokemons p JOIN especies e ON e.id = p.especie_id
      WHERE p.dono_id = $1
        AND (p.posicao_vitrine IS NOT NULL
             OR (p.posicao_time IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM pokemons WHERE dono_id = $1 AND posicao_vitrine IS NOT NULL)))
      ORDER BY coalesce(p.posicao_vitrine, p.posicao_time)`,
    [donoId],
  );
  return rows;
}

/** Trava o usuário, como definirTime, para dois salvamentos não se misturarem */
async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}

/** Quantos desses Pokémon são do usuário */
async function contarPokemonsDoDono(db, pokemonIds, usuarioId) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM pokemons WHERE id = ANY($1) AND dono_id = $2',
    [pokemonIds, usuarioId],
  );
  return rowCount;
}

async function salvarApresentacao(db, usuarioId, { bio, estilo }) {
  await db.query(
    `INSERT INTO vitrines (usuario_id, bio, estilo) VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET bio = $2, estilo = $3, atualizada_em = now()`,
    [usuarioId, bio, estilo],
  );
}

/** Grava os destaques na ordem recebida (posição 1, 2, 3...) */
async function definirDestaques(client, usuarioId, pokemonIds) {
  // Limpa antes de gravar para não esbarrar no UNIQUE (dono_id, posicao_vitrine)
  await client.query('UPDATE pokemons SET posicao_vitrine = NULL WHERE dono_id = $1', [usuarioId]);
  for (const [i, id] of pokemonIds.entries()) {
    await client.query('UPDATE pokemons SET posicao_vitrine = $2 WHERE id = $1', [id, i + 1]);
  }
}

/**
 * Vitrines de outros treinadores, as mais visitadas primeiro, com até 3 destaques de prévia.
 * @param {Db} db
 * @param {number} usuarioId  fica fora da lista
 * @param {string} busca      começo do login (vazio = todos)
 */
async function listarVitrines(db, usuarioId, busca) {
  const { rows } = await db.query(
    `SELECT u.login,
            coalesce(v.visitas, 0) AS visitas,
            v.bio,
            (SELECT count(DISTINCT especie_id) FROM pokemons WHERE dono_id = u.id) AS especies,
            (SELECT json_agg(json_build_object('especieId', d.especie_id, 'shiny', d.shiny))
               FROM (SELECT especie_id, shiny FROM pokemons
                      WHERE dono_id = u.id AND (posicao_vitrine IS NOT NULL OR posicao_time IS NOT NULL)
                      ORDER BY posicao_vitrine NULLS LAST, posicao_time
                      LIMIT 3) d) AS previa
       FROM usuarios u
       LEFT JOIN vitrines v ON v.usuario_id = u.id
      WHERE u.id <> $1
        AND u.login ILIKE $2
        AND EXISTS (SELECT 1 FROM pokemons WHERE dono_id = u.id)
      ORDER BY coalesce(v.visitas, 0) DESC, u.ultimo_acesso_em DESC
      LIMIT 30`,
    [usuarioId, comecaCom(busca)],
  );
  return rows;
}

module.exports = {
  buscarDonoPorLogin,
  lerVitrine,
  registrarVisita,
  contarColecao,
  listarEspecies,
  contarVitorias,
  buscarDestaques,
  travarUsuario,
  contarPokemonsDoDono,
  salvarApresentacao,
  definirDestaques,
  listarVitrines,
};
