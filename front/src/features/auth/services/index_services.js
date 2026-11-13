import { chamar, salvarToken } from '@/core';

export { temSessao } from '@/core';

// Conta
export async function cadastrar(dados) {
  const resposta = await chamar('POST', '/auth/cadastro', dados);
  salvarToken(resposta.token);
  return resposta.usuario;
}

export async function entrar(login, senha) {
  const resposta = await chamar('POST', '/auth/login', { login, senha });
  salvarToken(resposta.token);
  return resposta.usuario;
}

export async function sair() {
  try {
    await chamar('POST', '/auth/sair');
  } finally {
    salvarToken(null);
  }
}

export const verificarUsuario = async (dados) => (await chamar('POST', '/auth/verificar', dados)).encontrado;
export const redefinirSenha = (dados) => chamar('POST', '/auth/redefinir-senha', dados);

export const buscarEu = () => chamar('GET', '/eu');
// Sinal de vida enquanto o jogo está aberto (status online)
export const marcarPresenca = () => chamar('POST', '/presenca');
