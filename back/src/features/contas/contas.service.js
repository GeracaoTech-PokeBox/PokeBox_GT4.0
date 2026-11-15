// Contas: cadastro, login, troca de senha e sessões.
// Regras de negócio e transações; o SQL fica no model e a criptografia em contas.senhas.
const { pool, transacao } = require('../../banco/db');
const { registrarNoExtrato } = require('../../banco/extrato');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const model = require('./contas.model');
const senhas = require('./contas.senhas');

const SESSAO_DURACAO_MS = 30 * 24 * 60 * 60 * 1000;
// Grava o acesso/presença no máximo a cada 15s, para não escrever no banco a cada requisição
const ATUALIZAR_ACESSO_MS = 15 * 1000;

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

/** Cria uma sessão e devolve o token (só o hash vai para o banco) */
async function criarSessao(usuarioId) {
  const token = senhas.gerarToken();
  await model.inserirSessao(pool, {
    tokenHash: senhas.hashToken(token),
    usuarioId,
    expiraEm: new Date(Date.now() + SESSAO_DURACAO_MS),
  });
  return token;
}

/**
 * Usuário dono do token, ou null se o token não existe ou expirou.
 * Também marca o último acesso e a presença online (lista de treinadores e status na batalha),
 * mas só grava se passou de ATUALIZAR_ACESSO_MS, para não escrever no banco a cada requisição.
 */
async function usuarioDaSessao(token) {
  const linha = await model.buscarUsuarioDaSessao(pool, senhas.hashToken(token));
  if (!linha) return null;

  const { ultimo_acesso_em: ultimoAcesso, online_em: onlineEm, ...usuario } = linha;
  const antigo = (data) => !data || Date.now() - data.getTime() > ATUALIZAR_ACESSO_MS;
  if (antigo(ultimoAcesso) || antigo(onlineEm)) await model.marcarAcesso(pool, usuario.id);
  return usuario;
}

/** Fecha a sessão e deixa o treinador offline na hora (sem esperar JANELA_ONLINE_MS) */
async function encerrarSessao(token) {
  await model.encerrarSessao(pool, senhas.hashToken(token));
}

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

/**
 * Cria a conta com o bônus de Pokécoins. O inicial é escolhido depois, na tela
 * "Meus Pokémon" (loja: escolherInicial), como o front já faz hoje.
 * @param {{ login: string, celular: string, senha: string }} dados
 */
async function cadastrarUsuario({ login, celular, senha }) {
  const senhaHash = await senhas.gerarHashSenha(senha);

  const usuario = await transacao(async (client) => {
    const novo = await model.inserirUsuario(client, {
      login, celular, senhaHash, pokecoins: config.POKECOINS_CADASTRO,
    });
    if (!novo) throw new ErroJogo('Esse login já está em uso.');

    await registrarNoExtrato(client, {
      usuarioId: novo.id, valor: config.POKECOINS_CADASTRO, motivo: 'bonus_cadastro',
    });
    return novo;
  });
  return { usuario, token: await criarSessao(usuario.id) };
}

/** Devolve { usuario, token } ou lança erro com mensagem genérica (não revela se o login existe) */
async function entrar(login, senha) {
  const encontrado = await model.buscarComSenha(pool, login);
  if (!encontrado || !(await senhas.conferirSenha(senha, encontrado.senha_hash))) {
    throw new ErroJogo('Usuário ou senha incorretos.');
  }
  const { senha_hash: _, ...usuario } = encontrado;
  await model.marcarAcesso(pool, usuario.id);
  return { usuario, token: await criarSessao(usuario.id) };
}

async function existeUsuario(login, celular) {
  return model.existeComCelular(pool, login, celular);
}

/** Troca a senha e derruba todas as sessões abertas daquele usuário */
async function redefinirSenha({ login, celular, senha }) {
  const senhaHash = await senhas.gerarHashSenha(senha);
  return transacao(async (client) => {
    const usuarioId = await model.atualizarSenha(client, { login, celular, senhaHash });
    if (!usuarioId) throw new ErroJogo('Não encontramos um treinador com esse usuário e celular.');
    await model.apagarSessoesDoUsuario(client, usuarioId);
  });
}

module.exports = {
  usuarioDaSessao,
  encerrarSessao,
  cadastrarUsuario,
  entrar,
  existeUsuario,
  redefinirSenha,
};
