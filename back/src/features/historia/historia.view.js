// História: formato do JSON que vai para o front
const config = require('../../compartilhado/config');
const { statusSelvagem, chanceDeCaptura, forcaDoPonto } = require('./historia.regras');
const { atributosDe } = require('./historia.batalha');

/** Encontro no formato do front */
function encontro(linha) {
  return {
    id: linha.id,
    trilha: linha.trilha,
    ponto: linha.ponto,
    forca: linha.forca,
    especieId: linha.especie_id,
    nome: linha.nome,
    tipos: linha.tipos,
    raridade: linha.raridade,
    shiny: linha.shiny,
    nivel: linha.nivel,
    status: statusSelvagem(linha, atributosDe(linha), linha.forca),
    situacao: linha.status,
    // Revanche: batalha extra num ponto que já foi vencido (não conta para a trilha)
    revanche: linha.revanche,
    pontoVencido: linha.revanche || linha.status !== 'encontrado',
    // Batalha em andamento (null fora dela)
    batalha: linha.estado ? { estado: linha.estado, log: linha.log, fim: null } : null,
    recompensa: linha.recompensa,
    // Depende da espécie (capture_rate da PokeAPI); null só enquanto a espécie antiga não foi completada
    chanceCaptura: linha.taxa_captura == null ? null : chanceDeCaptura(linha.taxa_captura),
    tentativasCaptura: linha.tentativas_captura,
    tentativasRestantes: Math.max(0, config.TENTATIVAS_CAPTURA_MAXIMO - linha.tentativas_captura),
    pokemonCapturadoId: linha.pokemon_id,
  };
}

/** Batalha em andamento devolvida como estava (o front retoma de onde parou) */
const retomada = (linha) => ({
  encontro: encontro(linha),
  batalha: { estado: linha.estado, log: linha.log, fim: null },
});

/** A tela da história: regras, o último encontro de cada ponto e o próximo ponto */
function historia({ encontros, totais, proximo }) {
  return {
    trilhas: config.HISTORIA_TRILHAS,
    pontosPorTrilha: config.HISTORIA_PONTOS_POR_TRILHA,
    tentativasCaptura: config.TENTATIVAS_CAPTURA_MAXIMO,
    custoRefazer: config.CUSTO_REFAZER_HISTORIA,
    // Para o front mostrar a recompensa de cada ponto antes da luta (mesma conta de xpDaHistoria)
    recompensa: config.HISTORIA_RECOMPENSA,
    vencidos: totais.vencidos,
    capturados: totais.capturados,
    proximo: proximo && { ...proximo, forca: forcaDoPonto(proximo.trilha, proximo.ponto) },
    encontros: encontros.map(encontro),
  };
}

module.exports = { encontro, retomada, historia };
