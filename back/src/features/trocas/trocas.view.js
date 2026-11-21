// Trocas: formato do JSON que vai para o front
// O card anunciado vem no formato público da feature pokemons (sem afeto nem cuidados; com os golpes)
const { cardPublico } = require('../pokemons');

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
