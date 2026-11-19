// Treinadores: acesso ao banco. Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.
const { comecaCom } = require('../../banco/busca');

/** Logins que começam com `busca`, em ordem alfabética (até 10), sem o próprio usuário */
async function buscarLogins(db, usuarioId, busca) {
  const { rows } = await db.query(
    `SELECT login FROM usuarios
      WHERE id <> $1 AND login ILIKE $2
      ORDER BY lower(login)
      LIMIT 10`,
    [usuarioId, comecaCom(busca)],
  );
  return rows.map((r) => r.login);
}

/**
 * Treinadores com acesso recente, online e com o time completo, do acesso mais recente
 * para o mais antigo (até 50). Para cada um diz se já há desafio pendente ou batalha em
 * andamento com `usuarioId`.
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {number} usuarioId  fica fora da lista
 * @param {{ janelaHoras: number, tamanhoTime: number, janelaOnlineSegundos: number }} filtros
 */
async function listarAtivos(db, usuarioId, { janelaHoras, tamanhoTime, janelaOnlineSegundos }) {
  const { rows } = await db.query(
    `SELECT u.login,
            u.ultimo_acesso_em AS "ultimoAcessoEm",
            round(avg(p.nivel))::int AS "nivelMedio",
            json_agg(json_build_object('especieId', p.especie_id, 'nome', e.nome, 'shiny', p.shiny, 'nivel', p.nivel)
                     ORDER BY p.posicao_time) AS time,
            EXISTS (SELECT 1 FROM batalhas b
                     WHERE b.status = 'aguardando' AND b.expira_em > now()
                       AND b.desafiante_id = $1 AND b.desafiado_id = u.id) AS "desafioEnviado",
            EXISTS (SELECT 1 FROM batalhas b
                     WHERE b.status = 'aguardando' AND b.expira_em > now()
                       AND b.desafiante_id = u.id AND b.desafiado_id = $1) AS "desafioRecebido",
            EXISTS (SELECT 1 FROM batalhas b
                     WHERE b.status = 'em_andamento'
                       AND $1 IN (b.desafiante_id, b.desafiado_id)
                       AND u.id IN (b.desafiante_id, b.desafiado_id)) AS "emBatalha"
       FROM usuarios u
       JOIN pokemons p ON p.dono_id = u.id AND p.posicao_time IS NOT NULL
       JOIN especies e ON e.id = p.especie_id
      WHERE u.id <> $1
        AND u.ultimo_acesso_em > now() - make_interval(hours => $2)
        AND u.online_em > now() - make_interval(secs => $4)
      GROUP BY u.id
     HAVING count(*) = $3
      ORDER BY u.ultimo_acesso_em DESC
      LIMIT 50`,
    [usuarioId, janelaHoras, tamanhoTime, janelaOnlineSegundos],
  );
  return rows;
}

module.exports = { buscarLogins, listarAtivos };
