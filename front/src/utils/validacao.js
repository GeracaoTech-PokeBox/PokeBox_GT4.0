export const CELULAR_DIGITOS = 11
export const SENHA_MINIMA = 6

export function somenteDigitos(valor) {
  return valor.replace(/\D/g, '')
}

// Mantém só os números e aplica a máscara (00) 00000-0000
export function formatarCelular(valor) {
  const digitos = somenteDigitos(valor).slice(0, CELULAR_DIGITOS)
  if (digitos.length <= 2) return digitos.replace(/^(\d{1,2})/, '($1')
  if (digitos.length <= 7) return digitos.replace(/^(\d{2})(\d+)/, '($1) $2')
  return digitos.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
}

// Cada validação devolve a mensagem de erro, ou null quando está tudo certo
export function validarCelular(celular) {
  if (somenteDigitos(celular).length !== CELULAR_DIGITOS) {
    return 'Informe um celular válido com DDD.'
  }
  return null
}

export function validarNovaSenha(senha, confirmarSenha) {
  if (senha.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  }
  if (senha !== confirmarSenha) {
    return 'As senhas não conferem.'
  }
  return null
}
