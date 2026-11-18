// Regras puras do Pokémon (sem banco nem rede): mint, status, afeto, cuidados, XP e evolução.
// Usadas por várias features e pelo motor de batalha. Testadas em test/unit/regras.test.js.
const config = require('../compartilhado/config');
const { rngSeguro, inteiroEntre, decimalEntre } = require('../compartilhado/aleatorio');
const { ErroJogo } = require('../compartilhado/erros');

/**
 * @typedef {object} Especie
 * @property {number} id
 * @property {string} nome
 * @property {string[]} tipos
 * @property {number} hp_base
 * @property {number} ataque_base
 * @property {number} defesa_base
 * @property {number} velocidade_base
 * @property {number} altura_base   //decímetros
 * @property {number} peso_base     //hectogramas
 * @property {'comum' | 'lendario' | 'mitico'} raridade
 * @property {Evolucao[]} evolucoes
 *
 * @typedef {object} Evolucao
 * @property {number} especieId
 * @property {string} nome
 * @property {number} nivel  // nível mínimo para evoluir
 *
 * @typedef {object} AtributosSorteados
 * @property {boolean} shiny
 * @property {number} iv_hp
 * @property {number} iv_ataque
 * @property {number} iv_defesa
 * @property {number} iv_velocidade
 * @property {number} mult_altura
 * @property {number} mult_peso
 *
 * @typedef {object} BonusStatus  //pontos extras ganhos ao evoluir
 * @property {number} hp
 * @property {number} ataque
 * @property {number} defesa
 * @property {number} velocidade
 *
 * @typedef {AtributosSorteados & { especie_id: number, nivel: number, xp: number,
 *   bonus_hp?: number, bonus_ataque?: number, bonus_defesa?: number, bonus_velocidade?: number }} Pokemon
 *
 * @typedef {object} Status
 * @property {number} hp
 * @property {number} ataque
 * @property {number} defesa
 * @property {number} velocidade
 */

// ---------------------------------------------------------------------------
// Mint
// ---------------------------------------------------------------------------

/**
 * Sorteia o que torna o card único. O shiny é sorteado primeiro porque ele
 * aumenta o mínimo dos IVs.
 * @param {import('../compartilhado/aleatorio').Rng} [rng]
 * @returns {AtributosSorteados}
 */
function sortearAtributos(rng = rngSeguro) {
  const shiny = rng() < config.CHANCE_SHINY;
  const ivMinimo = shiny ? config.IV_MINIMO_SHINY : 0;
  const iv = () => inteiroEntre(rng, ivMinimo, config.IV_MAXIMO);

  return {
    shiny,
    iv_hp: iv(),
    iv_ataque: iv(),
    iv_defesa: iv(),
    iv_velocidade: iv(),
    mult_altura: decimalEntre(rng, config.MULT_MINIMO, config.MULT_MAXIMO),
    mult_peso: decimalEntre(rng, config.MULT_MINIMO, config.MULT_MAXIMO),
  };
}


// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * Fórmula dos jogos principais (sem EVs e natureza):
 *   HP     = (2 * base + IV) * nível / 100 + nível + 10
 *   outros = (2 * base + IV) * nível / 100 + 5
 * Depois soma o bônus do afeto (+2% por coração) e os pontos extras ganhos nas evoluções.
 * @param {Especie} especie
 * @param {Pokemon & { afeto?: number }} pokemon
 * @returns {Status}
 */
function calcularStatus(especie, pokemon) {
  const escala = (base, iv) => Math.floor(((2 * base + iv) * pokemon.nivel) / 100);
  const bonus = 1 + bonusAfeto(pokemon.afeto);
  const comBonus = (valor) => Math.floor(valor * bonus);
  // Ataque, defesa e velocidade usam a mesma fórmula (colunas <nome>_base, iv_<nome> e bonus_<nome>)
  const statusComum = (nome) => comBonus(escala(especie[`${nome}_base`], pokemon[`iv_${nome}`]) + 5)
    + (pokemon[`bonus_${nome}`] ?? 0);
  return {
    hp: comBonus(escala(especie.hp_base, pokemon.iv_hp) + pokemon.nivel + 10) + (pokemon.bonus_hp ?? 0),
    ataque: statusComum('ataque'),
    defesa: statusComum('defesa'),
    velocidade: statusComum('velocidade'),
  };
}

// ---------------------------------------------------------------------------
// Afeto
// ---------------------------------------------------------------------------

/** Corações cheios (0 a 5) */
function coracoes(afeto = 0) {
  return Math.floor(Math.min(afeto, config.AFETO_MAXIMO) / config.AFETO_POR_CORACAO);
}

/** Bônus de status do afeto, em fração (0.06 = +6%) */
function bonusAfeto(afeto = 0) {
  return Math.round(coracoes(afeto) * config.BONUS_STATUS_POR_CORACAO * 1000) / 1000;
}

const afetoMaximo = (afeto = 0) => afeto >= config.AFETO_MAXIMO;

const limitarBemEstar = (valor) => Math.max(0, Math.min(config.BEM_ESTAR_MAXIMO, valor));

/**
 * Humor e energia de agora: o banco guarda o valor no momento bem_estar_em e eles caem com o tempo.
 * @param {{ humor?: number, energia?: number, bem_estar_em?: Date | string }} pokemon
 * @param {Date} [agora]
 * @returns {{ humor: number, energia: number }}
 */
function bemEstarAtual(pokemon, agora = new Date()) {
  const { humor = config.BEM_ESTAR_INICIAL, energia = config.BEM_ESTAR_INICIAL, bem_estar_em: desde } = pokemon;
  const horas = desde ? Math.max(0, agora.getTime() - new Date(desde).getTime()) / (60 * 60 * 1000) : 0;
  return {
    humor: limitarBemEstar(Math.round(humor - horas * config.DESGASTE_POR_HORA.humor)),
    energia: limitarBemEstar(Math.round(energia - horas * config.DESGASTE_POR_HORA.energia)),
  };
}

/**
 * Confere que `tipo` é um dos cuidados de config.CUIDADOS e o devolve.
 * hasOwn: senão 'toString', 'constructor'... achariam a propriedade herdada de Object
 */
function tipoDeCuidado(tipo) {
  if (!Object.hasOwn(config.CUIDADOS, tipo)) throw new ErroJogo('Cuidado inválido.');
  return tipo;
}

/**
 * Aplica um cuidado (carinho, brincar, alimentar), respeitando a espera desde o último do mesmo tipo.
 * Brincar gasta energia: sem energia suficiente, o Pokémon está cansado demais.
 * @param {{ afeto: number, humor: number, energia: number }} atual  humor e energia já com o desgaste
 * @param {'carinho' | 'brincar' | 'alimentar'} tipo
 * @param {Date | null} ultimoEm    último cuidado desse tipo neste Pokémon
 * @param {Date} [agora]
 * @returns {{ afeto: number, humor: number, energia: number, ganho: number }}
 */
function aplicarCuidado(atual, tipo, ultimoEm, agora = new Date()) {
  const cuidado = config.CUIDADOS[tipoDeCuidado(tipo)];
  if (ultimoEm && agora.getTime() - ultimoEm.getTime() < cuidado.esperaMs) {
    throw new ErroJogo('Esse cuidado ainda não está disponível. Espere um pouco e tente de novo.');
  }
  if (atual.energia + cuidado.energia < 0) {
    throw new ErroJogo('Seu Pokémon está cansado demais para brincar. Alimente-o primeiro.');
  }
  const afeto = Math.min(config.AFETO_MAXIMO, atual.afeto + cuidado.afeto);
  return {
    afeto,
    humor: limitarBemEstar(atual.humor + cuidado.humor),
    energia: limitarBemEstar(atual.energia + cuidado.energia),
    ganho: afeto - atual.afeto,
  };
}

// ---------------------------------------------------------------------------
// Golpes
// ---------------------------------------------------------------------------

/** O que o card e a batalha mostram de um golpe especial (linha da tabela golpes) */
function resumoGolpe(g) {
  return {
    id: g.id, nome: g.nome, tipo: g.tipo, classe: g.classe, poder: g.poder, precisao: g.precisao, pp: g.pp,
  };
}

// ---------------------------------------------------------------------------
// XP e evolução
// ---------------------------------------------------------------------------

/**
 * Soma XP e sobe quantos níveis couberem (uma vitória pode subir mais de um).
 * O campo xp guarda só o que sobrou dentro do nível atual; no nível máximo ele zera.
 * @param {{ nivel: number, xp: number }} pokemon
 * @param {number} xpGanho
 * @returns {{ nivel: number, xp: number, niveisGanhos: number }}
 */
function aplicarXp({ nivel, xp }, xpGanho) {
  const nivelInicial = nivel;
  let restante = xp + xpGanho;

  while (nivel < config.NIVEL_MAXIMO && restante >= config.xpParaSubir(nivel)) {
    restante -= config.xpParaSubir(nivel);
    nivel += 1;
  }
  if (nivel === config.NIVEL_MAXIMO) restante = 0;

  return { nivel, xp: restante, niveisGanhos: nivel - nivelInicial };
}

/**
 * Sorteia os pontos extras de uma evolução: cada status tem a própria chance (BONUS_EVOLUCAO.chance)
 * de ganhar de BONUS_EVOLUCAO.minimo a maximo pontos; os outros ficam com 0.
 * @param {import('../compartilhado/aleatorio').Rng} [rng]
 * @returns {BonusStatus}
 */
function sortearBonusEvolucao(rng = rngSeguro) {
  const { chance, minimo, maximo } = config.BONUS_EVOLUCAO;
  const sortear = () => (rng() < chance ? inteiroEntre(rng, minimo, maximo) : 0);
  return {
    hp: sortear(), ataque: sortear(), defesa: sortear(), velocidade: sortear(),
  };
}

/**
 * Evoluções liberadas no nível atual (vazio = botão "Evoluir" escondido)
 * @returns {Evolucao[]}
 */
function evolucoesDisponiveis(especie, pokemon) {
  return especie.evolucoes.filter((evolucao) => pokemon.nivel >= evolucao.nivel);
}


module.exports = {
  sortearAtributos,
  calcularStatus,
  coracoes,
  bonusAfeto,
  afetoMaximo,
  tipoDeCuidado,
  aplicarCuidado,
  bemEstarAtual,
  aplicarXp,
  sortearBonusEvolucao,
  evolucoesDisponiveis,
  resumoGolpe,
};
