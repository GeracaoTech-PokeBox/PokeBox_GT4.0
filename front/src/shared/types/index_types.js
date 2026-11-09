import PropTypes from 'prop-types';

/* Contratos de dados usados por várias features (PropTypes, já que o projeto não usa TypeScript).
 * formatoPokemon era de models/formatos.
 */

// Formato de um card do jogador como o back devolve (GET /api/eu)
export const formatoPokemon = PropTypes.shape({
  id: PropTypes.number.isRequired,
  mintNumero: PropTypes.number.isRequired,
  especieId: PropTypes.number.isRequired,
  nome: PropTypes.string.isRequired,
  tipos: PropTypes.arrayOf(PropTypes.string).isRequired,
  raridade: PropTypes.string.isRequired,
  shiny: PropTypes.bool.isRequired,
  nivel: PropTypes.number.isRequired,
  xp: PropTypes.number.isRequired,
  xpParaSubir: PropTypes.number,
  ivs: PropTypes.objectOf(PropTypes.number).isRequired,
  status: PropTypes.objectOf(PropTypes.number).isRequired,
  // Pontos extras ganhos nas evoluções (já somados em status)
  bonusEvolucao: PropTypes.objectOf(PropTypes.number),
  alturaM: PropTypes.number.isRequired,
  pesoKg: PropTypes.number.isRequired,
  posicaoTime: PropTypes.number,
  posicaoVitrine: PropTypes.number,
  anunciado: PropTypes.bool.isRequired,
  afeto: PropTypes.shape({
    pontos: PropTypes.number.isRequired,
    coracoes: PropTypes.number.isRequired,
    maximo: PropTypes.bool.isRequired,
    faltamParaProximo: PropTypes.number,
    bonusStatus: PropTypes.number.isRequired,
  }).isRequired,
  humor: PropTypes.number.isRequired,
  energia: PropTypes.number.isRequired,
  // Quando cada cuidado volta (data ISO) ou null se já está disponível
  cuidadosDisponiveisEm: PropTypes.objectOf(PropTypes.string).isRequired,
  // Golpes especiais sorteados com o afeto máximo
  golpes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    nome: PropTypes.string.isRequired,
    tipo: PropTypes.string.isRequired,
    classe: PropTypes.string.isRequired,
    poder: PropTypes.number.isRequired,
    precisao: PropTypes.number,
    pp: PropTypes.number.isRequired,
  })),
  custoRoletaGolpes: PropTypes.number,
  golpesLiberados: PropTypes.bool,
  custoDesbloqueioGolpes: PropTypes.number,
  evolucoes: PropTypes.arrayOf(PropTypes.shape({
    especieId: PropTypes.number.isRequired,
    nome: PropTypes.string.isRequired,
    nivel: PropTypes.number.isRequired,
    disponivel: PropTypes.bool.isRequired,
  })).isRequired,
});
