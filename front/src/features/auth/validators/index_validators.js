import { CELULAR_DIGITOS, LOGIN_MAXIMO, SENHA_MINIMA } from '../constants/index_constants';
import { somenteDigitos } from '../utils/index_utils';

// Cada validação devolve a mensagem de erro, ou null quando está tudo certo
export function validarLogin(login) {
  if (login.trim().length > LOGIN_MAXIMO) {
    return `O usuário pode ter no máximo ${LOGIN_MAXIMO} caracteres.`;
  }
  return null;
}

export function validarCelular(celular) {
  if (somenteDigitos(celular).length !== CELULAR_DIGITOS) {
    return 'Informe um celular válido com DDD.';
  }
  return null;
}

export function validarNovaSenha(senha, confirmarSenha) {
  if (senha.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  if (senha !== confirmarSenha) {
    return 'As senhas não conferem.';
  }
  return null;
}
