// História: regras puras (sem banco nem rede) da força dos pontos, do Pokémon selvagem, da captura e do XP.
// Testadas em test/unit/regras.test.js.
const config = require('../../compartilhado/config');
const { calcularStatus } = require('../../nucleo/regras');

/** @typedef {import('../../nucleo/regras').Especie} Especie */
/** @typedef {import('../../nucleo/regras').AtributosSorteados} AtributosSorteados */
/** @typedef {import('../../nucleo/regras').Status} Status */

/**
 * Multiplicador de força de um ponto da história, com uma casa decimal.
 * Trilha 1: 0,1x no ponto 1 até 1,0x no ponto 10; trilha 2: 1,1x até 2,0x; e assim por diante.
 */
function forcaDoPonto(trilha, ponto) {
  const forca = (trilha - 1) * config.HISTORIA_PONTOS_POR_TRILHA * config.HISTORIA_FORCA_POR_PONTO
    + ponto * config.HISTORIA_FORCA_POR_PONTO;
  return Math.round(forca * 10) / 10;
}

/**
 * Próximo ponto a explorar, a partir de quantos pontos o treinador já venceu (a trilha é linear).
 * @returns {{ trilha: number, ponto: number } | null}  null = história concluída
 */
function proximoPonto(vencidos) {
  const total = config.HISTORIA_TRILHAS * config.HISTORIA_PONTOS_POR_TRILHA;
  if (vencidos >= total) return null;
  return {
    trilha: Math.floor(vencidos / config.HISTORIA_PONTOS_POR_TRILHA) + 1,
    ponto: (vencidos % config.HISTORIA_PONTOS_POR_TRILHA) + 1,
  };
}

/** Nível mostrado (e usado no dano) do Pokémon selvagem: acompanha a força, de 1 a NIVEL_MAXIMO */
function nivelSelvagem(forca) {
  return Math.min(config.NIVEL_MAXIMO, Math.max(1, Math.round(config.HISTORIA_NIVEL_FORCA_NORMAL * forca)));
}

/**
 * Status do Pokémon selvagem: os status da espécie no nível da força normal, vezes a força.
 * @param {Especie} especie
 * @param {AtributosSorteados} atributos
 * @param {number} forca
 * @returns {Status}
 */
function statusSelvagem(especie, atributos, forca) {
  const normal = calcularStatus(especie, { ...atributos, nivel: config.HISTORIA_NIVEL_FORCA_NORMAL });
  const vezes = (valor) => Math.max(1, Math.floor(valor * forca));
  return {
    hp: vezes(normal.hp),
    ataque: vezes(normal.ataque),
    defesa: vezes(normal.defesa),
    velocidade: vezes(normal.velocidade),
  };
}

/**
 * Chance de capturar a espécie, a partir do capture_rate da PokeAPI, seguindo os pontos de
 * CHANCE_CAPTURA (10% nos lendários, 20% nos iniciais, 50% nos mais fáceis).
 * @param {number} taxaCaptura capture_rate da espécie
 */
function chanceDeCaptura(taxaCaptura) {
  const pontos = config.CHANCE_CAPTURA;
  const arredondar = (chance) => Math.round(chance * 1000) / 1000;
  if (taxaCaptura <= pontos[0][0]) return pontos[0][1];
  for (let i = 1; i < pontos.length; i += 1) {
    const [taxaAntes, chanceAntes] = pontos[i - 1];
    const [taxaDepois, chanceDepois] = pontos[i];
    if (taxaCaptura <= taxaDepois) {
      const proporcao = (taxaCaptura - taxaAntes) / (taxaDepois - taxaAntes);
      return arredondar(chanceAntes + proporcao * (chanceDepois - chanceAntes));
    }
  }
  return pontos.at(-1)[1];
}

/**
 * XP que cada Pokémon do time ganha ao vencer um ponto da história (cresce mais rápido que a força).
 * Numa revanche (ponto já vencido) é multiplicado por multXpRevanche.
 */
function xpDaHistoria(forca, revanche = false) {
  const { xpPorForca, xpPorForcaAoQuadrado, multXpRevanche } = config.HISTORIA_RECOMPENSA;
  const cheio = xpPorForca * forca + xpPorForcaAoQuadrado * forca * forca;
  return Math.round(revanche ? cheio * multXpRevanche : cheio);
}

/**
 * Como o encontro fica depois de uma tentativa de captura: capturado, fugiu (esgotou as
 * TENTATIVAS_CAPTURA_MAXIMO tentativas) ou continua como estava.
 * @param {{ capturou: boolean, tentativas: number, statusAtual: string }} tentativa
 *   tentativas = quantas já foram feitas, contando esta
 * @returns {{ status: string, fugiu: boolean }}
 */
function resultadoDaCaptura({ capturou, tentativas, statusAtual }) {
  if (capturou) return { status: 'capturado', fugiu: false };
  if (tentativas >= config.TENTATIVAS_CAPTURA_MAXIMO) return { status: 'fugiu', fugiu: true };
  return { status: statusAtual, fugiu: false };
}

module.exports = {
  forcaDoPonto,
  proximoPonto,
  nivelSelvagem,
  statusSelvagem,
  chanceDeCaptura,
  xpDaHistoria,
  resultadoDaCaptura,
};
