/*Perdão felipe por ter que revisar tantas linhas, mas prometo deixar o mais didatico possivel*/


/* Batalhas assíncronas: desafio, jogadas, prazo de 1 min por jogada e recompensas.

O prazo é conferido de dois jeitos, e os dois chamam resolverPrazo:
   1. batalhas.agendador.js roda a cada 10s e processa as batalhas vencidas;
   2. toda leitura/jogada confere o prazo antes, então o jogo continua certo
      mesmo se o agendador estiver parado ou atrasado.
 Toda mudança numa batalha acontece com a linha travada (SELECT ... FOR UPDATE),
 então uma jogada e o timeout nunca são aplicados ao mesmo tempo.

 Regras de negócio e transações; o SQL fica no model e o formato da resposta na view.*/
const { pool, transacao } = require('../../banco/db');
const carteira = require('../../banco/carteira');
const { travarUsuario } = require('../../banco/travas');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const motor = require('../../nucleo/motor');
const { darXp } = require('../pokemons');
const { buscarPorLogin } = require('../contas');
const model = require('./batalhas.model');
const view = require('./batalhas.view');

const depoisDe = (agora, ms) => new Date(agora.getTime() + ms);

const participa = (batalha, usuarioId) => batalha.desafiante_id === usuarioId || batalha.desafiado_id === usuarioId;
const indiceDo = (estado, usuarioId) => estado.lados.findIndex((lado) => lado.usuarioId === usuarioId);

/** Time de batalha do usuário (a história usa o mesmo) */
const carregarTime = (db, usuarioId) => model.carregarTime(db, usuarioId);

/** O time tem os TAMANHO_TIME Pokémon necessários para batalhar? */
const timeCompleto = (time) => time.length === config.TAMANHO_TIME;

async function travarBatalha(client, batalhaId) {
  const batalha = await model.travarBatalha(client, batalhaId);
  if (!batalha) throw new ErroJogo('Batalha não encontrada.');
  return batalha;
}

async function buscarBatalha(db, batalhaId, usuarioId) {
  return view.batalha(await model.buscarParaFront(db, batalhaId), usuarioId);
}

// ---------------------------------------------------------------------------
// Desafio
// ---------------------------------------------------------------------------

/**
 * Cria um desafio. O desafiado tem PRAZO_DESAFIO_MS para aceitar, depois ele expira.
 * @param {number} desafianteId
 * @param {string} loginOponente
 */
async function desafiar(desafianteId, loginOponente) {
  return transacao(async (client) => {
    // Trava o desafiante para dois cliques não passarem juntos pelos limites abaixo
    await travarUsuario(client, desafianteId);

    const desafiadoId = (await buscarPorLogin(client, loginOponente))?.id;
    if (!desafiadoId) throw new ErroJogo('Treinador não encontrado.');
    if (desafiadoId === desafianteId) throw new ErroJogo('Você não pode desafiar a si mesmo.');

    const time = await carregarTime(client, desafianteId);
    if (!timeCompleto(time)) {
      throw new ErroJogo(`Monte um time com ${config.TAMANHO_TIME} Pokémon antes de desafiar.`);
    }

    const agora = new Date();
    const pendentes = await model.contarDesafiosPendentes(client, desafianteId, desafiadoId, agora);
    if (pendentes.com_oponente > 0) throw new ErroJogo('Você já tem um desafio esperando esse treinador.');
    if (pendentes.total >= config.DESAFIOS_PENDENTES_MAXIMO) {
      throw new ErroJogo(`Você já tem ${config.DESAFIOS_PENDENTES_MAXIMO} desafios esperando resposta.`);
    }

    const id = await model.inserirDesafio(client, {
      desafianteId, desafiadoId, expiraEm: depoisDe(agora, config.PRAZO_DESAFIO_MS),
    });
    return buscarBatalha(client, id, desafianteId);
  });
}

/** Marca o desafio como expirado se o prazo para aceitar já passou */
async function expirarSeVencido(client, batalha, agora = new Date()) {
  if (batalha.status !== 'aguardando' || batalha.expira_em > agora) return false;
  await model.mudarStatus(client, batalha.id, 'expirada');
  return true;
}

/**
 * O desafiado aceita ou recusa. Ao aceitar, os dois times são congelados no
 * estado da batalha e o relógio de 1 min começa para quem joga primeiro.
 */
async function responderDesafio(usuarioId, batalhaId, aceitar) {
  // Expira numa transação própria, para ficar gravado mesmo se a resposta abaixo for recusada
  await transacao(async (client) => expirarSeVencido(client, await travarBatalha(client, batalhaId)));

  return transacao(async (client) => {
    const batalha = await travarBatalha(client, batalhaId);
    if (batalha.desafiado_id !== usuarioId) throw new ErroJogo('Esse desafio não é para você.');
    if (batalha.status === 'expirada') throw new ErroJogo('Esse desafio expirou.');
    if (batalha.status !== 'aguardando') throw new ErroJogo('Esse desafio já foi respondido.');

    if (!aceitar) {
      await model.mudarStatus(client, batalhaId, 'recusada');
      return buscarBatalha(client, batalhaId, usuarioId);
    }

    const [timeA, timeB] = [
      await carregarTime(client, batalha.desafiante_id),
      await carregarTime(client, batalha.desafiado_id),
    ];
    if (!timeCompleto(timeA) || !timeCompleto(timeB)) {
      throw new ErroJogo(`Os dois jogadores precisam de um time com ${config.TAMANHO_TIME} Pokémon.`);
    }
    const usuarios = await model.buscarLogins(client, [batalha.desafiante_id, batalha.desafiado_id]);
    const usuario = (id) => usuarios.find((u) => u.id === id);

    const estado = motor.criarEstado(
      motor.montarLado(usuario(batalha.desafiante_id), timeA),
      motor.montarLado(usuario(batalha.desafiado_id), timeB),
    );
    const agora = new Date();
    await model.iniciar(client, batalhaId, {
      estado,
      vezDe: estado.lados[estado.vez].usuarioId,
      prazoEm: depoisDe(agora, config.PRAZO_JOGADA_MS),
      agora,
    });
    return buscarBatalha(client, batalhaId, usuarioId);
  });
}

// ---------------------------------------------------------------------------
// Recompensas
// ---------------------------------------------------------------------------

/**
 * Quanto um lado recebe, já aplicando os limites anti-farm. Sem esses limites,
 * duas contas do mesmo dono poderiam batalhar entre si só para gerar Pokécoins.
 * coisa essa que o professor nos alertou durante o uso do jogo, ou então foi comentado pelo felipe.
 */
async function calcularPremio(client, {
  usuarioId, oponenteId, base, jogadasManuais,
}) {
  const nada = (semRecompensa) => ({ pokecoins: 0, xp: 0, semRecompensa });
  if (base.pokecoins === 0 && base.xp === 0) return nada('Quem abandona a batalha não recebe recompensa.');
  if (jogadasManuais < config.JOGADAS_MINIMAS_PARA_RECOMPENSA) {
    return nada('A batalha terminou cedo demais para dar recompensa.');
  }

  const recentes = await model.contarRecompensasRecentes(client, usuarioId, oponenteId);
  if (recentes.total >= config.RECOMPENSAS_POR_DIA) {
    return nada(`Limite de ${config.RECOMPENSAS_POR_DIA} batalhas premiadas em 24h atingido.`);
  }
  if (recentes.contra_oponente >= config.RECOMPENSAS_MESMO_OPONENTE_POR_DIA) {
    return nada(`Limite de ${config.RECOMPENSAS_MESMO_OPONENTE_POR_DIA} batalhas premiadas contra o mesmo treinador em 24h atingido.`);
  }
  return { ...base, semRecompensa: null };
}

/** Pokécoins para os jogadores e XP para os Pokémon do time de cada um */
async function distribuirRecompensas(client, batalhaId, estado, fim) {
  const jogadasManuais = await model.contarJogadasManuais(client, batalhaId);

  const perdedor = fim.vencedor === 0 ? 1 : 0;
  const lados = [
    { lado: estado.lados[fim.vencedor], oponente: estado.lados[perdedor], base: config.RECOMPENSA_VENCEDOR },
    {
      lado: estado.lados[perdedor],
      oponente: estado.lados[fim.vencedor],
      base: fim.motivo === 'nocaute' ? config.RECOMPENSA_PERDEDOR : config.RECOMPENSA_ABANDONO,
    },
  ];

  const recompensas = {};
  for (const { lado, oponente, base } of lados) {
    const premio = await calcularPremio(client, {
      usuarioId: lado.usuarioId, oponenteId: oponente.usuarioId, base, jogadasManuais,
    });
    if (premio.pokecoins > 0) {
      await carteira.creditar(client, {
        usuarioId: lado.usuarioId, valor: premio.pokecoins, motivo: 'recompensa_batalha', batalhaId,
      });
    }
    const subiram = await darXp(client, lado.usuarioId, lado.pokemons.map((p) => p.pokemonId), premio.xp);
    recompensas[lado.usuarioId] = { ...premio, subiram };
  }
  return recompensas;
}

// ---------------------------------------------------------------------------
// Jogadas
// ---------------------------------------------------------------------------

/**
 * Salva o resultado de uma ação (do jogador ou automática) e, se a batalha
 * acabou, entrega as recompensas na mesma transação: ou tudo é gravado ou nada.
 * Como a linha está travada e o status vira 'finalizada' aqui, a recompensa
 * nunca é paga duas vezes.
 * evita o bug de ficar dando recompensa duas vezes, caso o jogador clique duas vezes no botão de atacar.
 */
async function registrarResultado(client, batalha, {
  indiceJogador, tipo, automatica, resultado, agora,
}) {
  const { estado, eventos, fim } = resultado;

  await model.inserirAcao(client, {
    batalhaId: batalha.id,
    turno: batalha.turno,
    jogadorId: estado.lados[indiceJogador].usuarioId,
    tipo,
    automatica,
    eventos,
  });

  if (!fim) {
    await model.avancarTurno(client, batalha.id, {
      estado,
      vezDe: estado.lados[estado.vez].usuarioId,
      prazoEm: depoisDe(agora, config.PRAZO_JOGADA_MS),
      agora,
    });
    return;
  }

  await model.finalizar(client, batalha.id, {
    estado, vencedorId: estado.lados[fim.vencedor].usuarioId, motivo: fim.motivo, agora,
  });
  const recompensas = await distribuirRecompensas(client, batalha.id, estado, fim);
  await model.salvarRecompensas(client, batalha.id, recompensas);
}

/**
 * Se o prazo da jogada atual já venceu, aplica o timeout (passa a vez ou W.O.). --> analisar se seria interessante após 2 timeouts, já dar W.O. direto, para evitar que o jogador fique esperando 4h para perder a batalha.
 * O novo prazo conta a partir de agora, então no máximo um timeout vence por vez.
 * @returns {Promise<boolean>} true se aplicou um timeout
 */
async function resolverPrazo(client, batalha, agora = new Date()) {
  if (batalha.status !== 'em_andamento' || batalha.prazo_em > agora) return false;
  const resultado = motor.aplicarTimeout(batalha.estado);
  await registrarResultado(client, batalha, {
    indiceJogador: batalha.estado.vez, tipo: 'passar', automatica: true, resultado, agora,
  });
  return true;
}

/** Aplica timeout/expiração pendentes numa transação própria (fica gravado mesmo se o que vem depois falhar) */
async function atualizarPrazos(batalhaId) {
  await transacao(async (client) => {
    const batalha = await travarBatalha(client, batalhaId);
    await expirarSeVencido(client, batalha);
    await resolverPrazo(client, batalha);
  });
}

/**
 * Jogada do usuário.
 * @param {number} usuarioId
 * @param {number} batalhaId
 * @param {import('../../nucleo/motor').Acao} acao
 */
async function jogar(usuarioId, batalhaId, acao) {
  await atualizarPrazos(batalhaId);

  return transacao(async (client) => {
    const batalha = await travarBatalha(client, batalhaId);
    if (!participa(batalha, usuarioId)) throw new ErroJogo('Batalha não encontrada.');
    if (batalha.status !== 'em_andamento') throw new ErroJogo('Essa batalha não está em andamento.');

    const indice = indiceDo(batalha.estado, usuarioId);
    const resultado = motor.aplicarAcao(batalha.estado, indice, acao);
    await registrarResultado(client, batalha, {
      indiceJogador: indice, tipo: acao.tipo, automatica: false, resultado, agora: new Date(),
    });
    return buscarBatalha(client, batalhaId, usuarioId);
  });
}

/** Batalha com histórico, já com prazos conferidos */
async function obterBatalha(usuarioId, batalhaId) {
  await atualizarPrazos(batalhaId);

  const linha = await model.buscarParaFront(pool, batalhaId);
  if (!linha || !participa(linha, usuarioId)) throw new ErroJogo('Batalha não encontrada.');

  const acoes = await model.listarAcoes(pool, batalhaId);
  return { batalha: view.batalha(linha, usuarioId), acoes };
}

/** Batalhas do usuário: pendentes e em andamento primeiro, depois as últimas 20 encerradas */
async function listarBatalhas(usuarioId) {
  // Resolve prazos vencidos antes de listar, para a lista não mostrar estado velho
  for (const id of await model.idsVencidosDoUsuario(pool, usuarioId)) await atualizarPrazos(id);

  const linhas = await model.listarDoUsuario(pool, usuarioId);
  return linhas.map((linha) => view.batalha(linha, usuarioId));
}

// ---------------------------------------------------------------------------
// Agendador
// ---------------------------------------------------------------------------

/**
 * Processa as batalhas com prazo vencido. Cada batalha tem a própria transação,
 * então um erro numa não trava as outras. SKIP LOCKED pula a batalha que está
 * recebendo uma jogada agora (ela mesma resolve o prazo) e permite rodar o
 * agendador em mais de uma instância do back.
 * @returns {Promise<number>} quantas batalhas foram processadas
 *
 * foi uma saida para não usar o web socket, tenho a impressão que iria ficar muito pesado!
 */
async function processarPrazosVencidos(limite = 100) {
  const agora = new Date();
  const ids = await model.idsComJogadaVencida(pool, agora, limite);

  let processadas = 0;
  for (const id of ids) {
    try {
      await transacao(async (client) => {
        const travada = await model.travarBatalhaSeLivre(client, id);
        if (travada && (await resolverPrazo(client, travada, agora))) processadas += 1;
      });
    } catch (erro) {
      console.error(`Erro ao processar o prazo da batalha ${id}:`, erro);
    }
  }
  return processadas;
}

/** Desafios que ninguém respondeu no prazo viram 'expirada' (um único UPDATE, sem estado para calcular) */
async function expirarDesafios() {
  return model.expirarDesafiosVencidos(pool);
}

module.exports = {
  carregarTime,
  timeCompleto,
  desafiar,
  responderDesafio,
  jogar,
  obterBatalha,
  listarBatalhas,
  processarPrazosVencidos,
  expirarDesafios,
};
