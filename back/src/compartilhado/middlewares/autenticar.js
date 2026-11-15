// Exige o cabeçalho "Authorization: Bearer <token>" de uma sessão válida e
// coloca o usuário logado em req.usuario. Sem sessão, responde 401.
const usuarios = require('../../jogo/usuarios');

const tokenDe = (req) => req.get('authorization')?.match(/^Bearer (\w+)$/)?.[1] ?? null;

async function autenticar(req, res, next) {
  const token = tokenDe(req);
  const usuario = token && (await usuarios.usuarioDaSessao(token));
  if (!usuario) {
    res.status(401).json({ erro: 'Faça login para continuar.' });
    return;
  }
  req.usuario = usuario;
  next();
}

module.exports = { autenticar, tokenDe };
