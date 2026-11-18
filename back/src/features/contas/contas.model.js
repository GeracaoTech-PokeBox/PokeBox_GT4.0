// Contas: acesso ao banco (usuarios e sessoes). Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/** Cria o usuário; devolve undefined se o login já existe */
async function inserirUsuario(db, {
  login, celular, senhaHash, pokecoins,
}) {
  const { rows: [usuario] } = await db.query(
    `INSERT INTO usuarios (login, celular, senha_hash, pokecoins)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id, login, pokecoins`,
    [login, celular, senhaHash, pokecoins],
  );
  return usuario;
}

/** { id, login, criado_em } do usuário pelo login (sem diferenciar maiúsculas), ou undefined */
async function buscarPorLogin(db, login) {
  const { rows: [usuario] } = await db.query(
    'SELECT id, login, criado_em FROM usuarios WHERE lower(login) = lower($1)',
    [login],
  );
  return usuario;
}

/** Usuário pelo login (sem diferenciar maiúsculas), com o hash da senha */
async function buscarComSenha(db, login) {
  const { rows: [usuario] } = await db.query(
    'SELECT id, login, pokecoins, senha_hash FROM usuarios WHERE lower(login) = lower($1)',
    [login],
  );
  return usuario;
}

async function existeComCelular(db, login, celular) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM usuarios WHERE lower(login) = lower($1) AND celular = $2',
    [login, celular],
  );
  return rowCount > 0;
}

/** Troca a senha de quem tem esse login e celular; devolve o id, ou undefined se não achou */
async function atualizarSenha(db, { login, celular, senhaHash }) {
  const { rows: [usuario] } = await db.query(
    `UPDATE usuarios SET senha_hash = $3
      WHERE lower(login) = lower($1) AND celular = $2
      RETURNING id`,
    [login, celular, senhaHash],
  );
  return usuario?.id;
}

/** Marca último acesso e presença online agora */
async function marcarAcesso(db, usuarioId) {
  await db.query('UPDATE usuarios SET ultimo_acesso_em = now(), online_em = now() WHERE id = $1', [usuarioId]);
}

async function inserirSessao(db, { tokenHash, usuarioId, expiraEm }) {
  await db.query(
    'INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, $3)',
    [tokenHash, usuarioId, expiraEm],
  );
}

/** Usuário de uma sessão ainda válida, com as datas de acesso e presença */
async function buscarUsuarioDaSessao(db, tokenHash) {
  const { rows: [usuario] } = await db.query(
    `SELECT u.id, u.login, u.pokecoins, u.pokebolas, u.ultimo_acesso_em, u.online_em
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = $1 AND s.expira_em > now()`,
    [tokenHash],
  );
  return usuario;
}

/** Apaga a sessão e deixa o dono offline na hora */
async function encerrarSessao(db, tokenHash) {
  await db.query(
    `WITH fechada AS (DELETE FROM sessoes WHERE token_hash = $1 RETURNING usuario_id)
     UPDATE usuarios SET online_em = NULL WHERE id IN (SELECT usuario_id FROM fechada)`,
    [tokenHash],
  );
}

async function apagarSessoesDoUsuario(db, usuarioId) {
  await db.query('DELETE FROM sessoes WHERE usuario_id = $1', [usuarioId]);
}

module.exports = {
  inserirUsuario,
  buscarPorLogin,
  buscarComSenha,
  existeComCelular,
  atualizarSenha,
  marcarAcesso,
  inserirSessao,
  buscarUsuarioDaSessao,
  encerrarSessao,
  apagarSessoesDoUsuario,
};
