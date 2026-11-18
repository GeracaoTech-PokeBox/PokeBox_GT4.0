// Middleware de login: exige o cabeçalho "Authorization: Bearer <token>" de uma sessão válida,
// marca a presença do treinador e coloca o usuário logado em req.usuario. Sem sessão, responde 401.
// As outras features usam por aqui: require('../contas').autenticar
const service = require('./contas.service');

const tokenDe = (req) => req.get('authorization')?.match(/^Bearer (\w+)$/)?.[1] ?? null;

async function autenticar(req, res, next) {
  const token = tokenDe(req);
  const sessao = token && (await service.buscarSessao(token));
  if (!sessao) {
    res.status(401).json({ erro: 'Faça login para continuar.' });
    return;
  }
  // Toda requisição autenticada conta como sinal de vida (lista de online e status na batalha)
  await service.registrarPresenca(sessao);
  const { ultimo_acesso_em: _ultimoAcesso, online_em: _onlineEm, ...usuario } = sessao;
  req.usuario = usuario;
  next();
}

module.exports = { autenticar, tokenDe };
