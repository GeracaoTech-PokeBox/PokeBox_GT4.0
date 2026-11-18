// Trocas: formato do JSON que vai para o front
const { card } = require('../pokemons');

/**
 * O que qualquer treinador vê de um card anunciado. O afeto fica de fora (ele zera na troca),
 * então os status também são mostrados sem o bônus do afeto.
 */
function cardPublico(linha) {
  const completo = card({ ...linha, afeto: 0 });
  return {
    id: completo.id,
    mintNumero: completo.mintNumero,
    especieId: completo.especieId,
    nome: completo.nome,
    tipos: completo.tipos,
    raridade: completo.raridade,
    shiny: completo.shiny,
    nivel: completo.nivel,
    ivs: completo.ivs,
    ivTotal: Object.values(completo.ivs).reduce((soma, iv) => soma + iv, 0),
    status: completo.status,
    alturaM: completo.alturaM,
    pesoKg: completo.pesoKg,
  };
}

/** Linha de anúncio (SELECT_ANUNCIO) no formato do front */
function anuncio(linha, usuarioId) {
  return {
    id: linha.anuncio_id,
    preco: linha.preco,
    aceitaPropostas: linha.aceita_propostas,
    anunciadoEm: linha.anunciado_em,
    vendedor: linha.vendedor_login,
    meu: linha.vendedor_id === usuarioId,
    propostasPendentes: linha.propostas_pendentes ?? 0,
    pokemon: cardPublico(linha),
  };
}

/** Separa as propostas em recebidas e enviadas, sem os ids internos de vendedor e proponente */
function propostas(linhas, usuarioId) {
  const semIds = ({ vendedor_id: _v, proponente_id: _p, ...proposta }) => proposta;
  return {
    recebidas: linhas.filter((r) => r.vendedor_id === usuarioId).map(semIds),
    enviadas: linhas.filter((r) => r.proponente_id === usuarioId).map(semIds),
  };
}

module.exports = { anuncio, propostas };
