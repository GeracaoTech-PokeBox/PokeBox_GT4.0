// Middleware de login: exige o cabeçalho "Authorization: Bearer <token>" de uma sessão válida e
// coloca o usuário logado em req.usuario. Sem sessão, responde 401.
// As outras features usam por aqui: require('../contas').autenticar
const service = require('./contas.service');

const tokenDe = (req) => req.get('authorization')?.match(/^Bearer (\w+)$/)?.[1] ?? null;

async function autenticar(req, res, next) {
  const token = tokenDe(req);
  const usuario = token && (await service.usuarioDaSessao(token));
  if (!usuario) {
    res.status(401).json({ erro: 'Faça login para continuar.' });
    return;
  }
  req.usuario = usuario;
  next();
}

module.exports = { autenticar, tokenDe };
