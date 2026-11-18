// Contas: lê e valida a requisição, chama o service e responde
const { ErroJogo } = require('../../compartilhado/erros');
const { LOGIN_MAXIMO, texto } = require('../../compartilhado/validacao');
const service = require('./contas.service');
const { tokenDe } = require('./contas.autenticar');

const SENHA_MINIMA = 8;
const CELULAR = /^\d{11}$/;

/** Login e celular do corpo, já validados */
function loginECelular(corpo) {
  const login = texto(corpo.login, 'o usuário');
  if (login.length > LOGIN_MAXIMO) throw new ErroJogo(`O usuário pode ter no máximo ${LOGIN_MAXIMO} caracteres.`);
  const celular = texto(corpo.celular, 'o celular');
  if (!CELULAR.test(celular)) throw new ErroJogo('Informe um celular válido com DDD.');
  return { login, celular };
}

/** Login, celular e senha nova do corpo, já validados (nessa ordem) */
function dadosConta(corpo) {
  const { login, celular } = loginECelular(corpo);
  if (typeof corpo.senha !== 'string' || corpo.senha.length < SENHA_MINIMA) {
    throw new ErroJogo(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  return { login, celular, senha: corpo.senha };
}

async function cadastrar(req, res) {
  res.status(201).json(await service.cadastrarUsuario(dadosConta(req.body)));
}

async function entrar(req, res) {
  res.json(await service.entrar(texto(req.body.login, 'o usuário'), texto(req.body.senha, 'a senha')));
}

async function verificar(req, res) {
  const { login, celular } = loginECelular(req.body);
  res.json({ encontrado: await service.existeUsuario(login, celular) });
}

async function redefinirSenha(req, res) {
  await service.redefinirSenha(dadosConta(req.body));
  res.status(204).end();
}

async function sair(req, res) {
  await service.encerrarSessao(tokenDe(req));
  res.status(204).end();
}

module.exports = {
  cadastrar, entrar, verificar, redefinirSenha, sair,
};
