// Pokémon: formato do JSON que vai para o front (o card). Testado em test/unit/regras.test.js.
const config = require('../../compartilhado/config');
const {
  calcularStatus, coracoes, bonusAfeto, afetoMaximo, bemEstarAtual,
} = require('../../nucleo/regras');

/** Altura (m) e peso (kg) do card, calculados a partir da espécie atual */
function medidas(especie, pokemon) {
  return {
    alturaM: Math.round(especie.altura_base * pokemon.mult_altura * 10) / 100,
    pesoKg: Math.round(especie.peso_base * pokemon.mult_peso * 10) / 100,
  };
}

/** Afeto no formato do front */
function descreverAfeto(afeto = 0) {
  const cheios = coracoes(afeto);
  return {
    pontos: afeto,
    coracoes: cheios,
    maximo: afetoMaximo(afeto),
    // Pontos que faltam para o próximo coração (null no máximo)
    faltamParaProximo: afetoMaximo(afeto) ? null : (cheios + 1) * config.AFETO_POR_CORACAO - afeto,
    bonusStatus: bonusAfeto(afeto),
  };
}

/**
 * Quando cada cuidado volta a ficar disponível (null = já está)
 * @param {Record<string, string | Date> | null} ultimos  último cuidado de cada tipo
 */
function disponibilidadeCuidados(ultimos) {
  return Object.fromEntries(Object.entries(config.CUIDADOS).map(([tipo, { esperaMs }]) => {
    const ultimo = ultimos?.[tipo];
    const disponivelEm = ultimo ? new Date(new Date(ultimo).getTime() + esperaMs) : null;
    return [tipo, disponivelEm && disponivelEm > new Date() ? disponivelEm : null];
  }));
}

/**
 * Card pronto para o front, a partir de uma linha com CAMPOS_CARD (pokemons + especies)
 * @param {import('../../nucleo/regras').Pokemon & import('../../nucleo/regras').Especie
 *   & { id: number, mint_numero: number, posicao_time: number | null }} linha
 */
function descreverPokemon(linha) {
  const especie = linha;
  return {
    id: linha.id,
    mintNumero: linha.mint_numero,
    especieId: linha.especie_id,
    especieOriginalId: linha.especie_original_id,
    nome: especie.nome,
    tipos: especie.tipos,
    raridade: especie.raridade,
    shiny: linha.shiny,
    nivel: linha.nivel,
    xp: linha.xp,
    xpParaSubir: linha.nivel < config.NIVEL_MAXIMO ? config.xpParaSubir(linha.nivel) : null,
    ivs: {
      hp: linha.iv_hp, ataque: linha.iv_ataque, defesa: linha.iv_defesa, velocidade: linha.iv_velocidade,
    },
    status: calcularStatus(especie, linha),
    // Pontos extras somados nas evoluções (já incluídos em status)
    bonusEvolucao: {
      hp: linha.bonus_hp ?? 0,
      ataque: linha.bonus_ataque ?? 0,
      defesa: linha.bonus_defesa ?? 0,
      velocidade: linha.bonus_velocidade ?? 0,
    },
    ...medidas(especie, linha),
    posicaoTime: linha.posicao_time,
    posicaoVitrine: linha.posicao_vitrine,
    anunciado: Boolean(linha.anunciado),
    afeto: descreverAfeto(linha.afeto),
    // Golpes especiais (liberados com o afeto máximo) e quanto custa sortear de novo
    golpes: (linha.golpes_detalhe ?? []).map((g) => ({
      id: g.id, nome: g.nome, tipo: g.tipo, classe: g.classe, poder: g.poder, precisao: g.precisao, pp: g.pp,
    })),
    custoRoletaGolpes: linha.golpes?.length > 0 ? config.CUSTO_ROLETA_GOLPES : 0,
    // Liberados pelo afeto máximo ou pelo desbloqueio pago (custoDesbloqueioGolpes)
    golpesLiberados: afetoMaximo(linha.afeto) || Boolean(linha.golpes_desbloqueados),
    custoDesbloqueioGolpes: config.CUSTO_DESBLOQUEIO_GOLPES,
    ...bemEstarAtual(linha),
    cuidadosDisponiveisEm: disponibilidadeCuidados(linha.ultimos_cuidados),
    evolucoes: especie.evolucoes.map((evolucao) => ({
      ...evolucao,
      disponivel: linha.nivel >= evolucao.nivel,
    })),
  };
}

/** Card completo a partir de uma linha com CAMPOS_CARD */
const card = descreverPokemon;

module.exports = {
  card, descreverPokemon, descreverAfeto, medidas,
};
