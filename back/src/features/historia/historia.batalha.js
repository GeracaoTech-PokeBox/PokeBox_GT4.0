// História: a batalha contra o Pokémon selvagem, sobre o motor de batalha. Puro, sem banco:
// recebe o estado e devolve o próximo, e o service grava.
const motor = require('../../nucleo/motor');
const { statusSelvagem } = require('./historia.regras');

const TREINADOR = 0; // índices dos lados no estado da batalha
const SELVAGEM = 1;

/** IVs, shiny e medidas do selvagem (linha de historia_encontros), no formato de AtributosSorteados */
const atributosDe = (linha) => ({
  shiny: linha.shiny,
  iv_hp: linha.iv_hp,
  iv_ataque: linha.iv_ataque,
  iv_defesa: linha.iv_defesa,
  iv_velocidade: linha.iv_velocidade,
  mult_altura: linha.mult_altura,
  mult_peso: linha.mult_peso,
});

/** Lado do Pokémon selvagem no formato do motor (pokemonId 0: não é um card de ninguém) */
function montarSelvagem(linha) {
  const status = statusSelvagem(linha, atributosDe(linha), linha.forca);
  return {
    usuarioId: null,
    login: 'Selvagem',
    ativo: 0,
    timeoutsSeguidos: 0,
    pokemons: [{
      pokemonId: 0,
      mintNumero: null,
      especieId: linha.especie_id,
      nome: linha.nome,
      shiny: linha.shiny,
      nivel: linha.nivel,
      hpMax: status.hp,
      hp: status.hp,
      ataque: status.ataque,
      defesa: status.defesa,
      velocidade: status.velocidade,
      afetoMaximo: false,
      resistiu: false,
      tipos: linha.tipos, // o selvagem só usa o ataque básico, mas recebe a vantagem de tipo dos golpes
      golpes: [],
    }],
  };
}

/** O selvagem sempre ataca */
function turnoDoSelvagem(estado, log, rng) {
  const resultado = motor.aplicarAcao(estado, SELVAGEM, { tipo: 'atacar' }, rng);
  log.push({ lado: SELVAGEM, eventos: resultado.eventos });
  return resultado;
}

/** Jogada do treinador seguida da resposta do selvagem (se a batalha não acabou) */
function jogarTurno(estado, acao, log, rng) {
  const resultado = motor.aplicarAcao(estado, TREINADOR, acao, rng);
  log.push({ lado: TREINADOR, eventos: resultado.eventos });
  if (resultado.fim || resultado.estado.vez !== SELVAGEM) return resultado;
  return turnoDoSelvagem(resultado.estado, log, rng);
}

/**
 * Estado inicial com o time do treinador congelado; se o selvagem for mais rápido, ele já ataca.
 * @returns {{ estado: object, fim: object | null, log: object[] }}
 */
function comecar(usuario, time, encontro, rng) {
  const estado = motor.criarEstado(motor.montarLado(usuario, time), montarSelvagem(encontro), rng);
  estado.revanche = encontro.revanche; // o front usa para não pular para o próximo ponto no fim
  const log = [];
  const resultado = estado.vez === SELVAGEM ? turnoDoSelvagem(estado, log, rng) : { estado, fim: null };
  return { ...resultado, log };
}

module.exports = {
  TREINADOR, atributosDe, jogarTurno, comecar,
};
