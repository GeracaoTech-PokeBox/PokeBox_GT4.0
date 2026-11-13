import { CELULAR_DIGITOS } from '../constants/index_constants';

// Máscara do celular, usada por Cadastro e RecuperarSenha

export function somenteDigitos(valor) {
  return valor.replace(/\D/g, '');
}

// Mantém só os números e aplica a máscara (00) 00000-0000
export function formatarCelular(valor) {
  const digitos = somenteDigitos(valor).slice(0, CELULAR_DIGITOS);
  if (digitos.length <= 2) return digitos.replace(/^(\d{1,2})/, '($1');
  if (digitos.length <= 7) return digitos.replace(/^(\d{2})(\d+)/, '($1) $2');
  return digitos.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}
