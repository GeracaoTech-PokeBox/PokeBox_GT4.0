// Batalhas: quanto cada lado ganha no fim, com os limites anti-farm.
// Separado do service porque muda por motivos de balanceamento, não pelo fluxo de turnos.
const carteira = require('../../banco/carteira');
const config = require('../../compartilhado/config');
const motor = require('../../nucleo/motor');
const { darXp } = require('../pokemons');
const model = require('./batalhas.model');

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

  const perdedor = motor.outro(fim.vencedor);
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

module.exports = { distribuirRecompensas };
