// Leitura e validação dos dados que chegam nas requisições (corpo, parâmetros e query).
// Dado inválido vira ErroJogo, que o tratarErros devolve como 400 { erro: "mensagem" }.
const { ErroJogo } = require('./erros');

// Tamanho máximo do login; também limita as buscas por treinador
const LOGIN_MAXIMO = 20;

/** Texto obrigatório, já sem espaços nas pontas */
function texto(valor, nome) {
  if (typeof valor !== 'string' || !valor.trim()) throw new ErroJogo(`Informe ${nome}.`);
  return valor.trim();
}

/** Id ou quantidade: inteiro positivo */
function inteiro(valor, nome) {
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero <= 0) throw new ErroJogo(`${nome} inválido.`);
  return numero;
}

/** Termo de busca opcional da query string: texto cortado em `maximo` caracteres, ou '' */
function busca(valor, maximo) {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

/** Uma das chaves de `opcoes`; qualquer outro valor vira o padrão */
const opcao = (valor, opcoes, padrao) => (Object.hasOwn(opcoes, valor) ? valor : padrao);

/** Jogada de batalha vinda do corpo da requisição (mesmo formato nas batalhas e na história) */
function acaoDe(corpo) {
  const { tipo } = corpo;
  if (tipo === 'atacar' || tipo === 'desistir') return { tipo };
  if (tipo === 'trocar' || tipo === 'golpe') return { tipo, indice: Number(corpo.indice) };
  throw new ErroJogo('Jogada inválida.');
}

module.exports = {
  LOGIN_MAXIMO, texto, inteiro, busca, opcao, acaoDe,
};
