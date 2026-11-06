import PropTypes from 'prop-types';
import { formatarNome } from './tipos';

/* [DRY] Utilitários novos, centralizando lógica que estava copiada em vários componentes:
 *
 * 1. somaValores: Anunciar.jsx e PropostaForm.jsx tinham cada um a sua cópia idêntica de
 *      // const somaIvs = (ivs) => Object.values(ivs).reduce((soma, iv) => soma + iv, 0);
 *    e colecao.js somava status e IVs campo a campo
 *    (p.ivs.hp + p.ivs.ataque + p.ivs.defesa + p.ivs.velocidade). É a mesma conta: somar os
 *    4 valores de um objeto { hp, ataque, defesa, velocidade }.
 *
 * 2. IV_TOTAL_MAXIMO: Mercado.jsx tinha a constante, mas Anunciar.jsx, PropostaForm.jsx e
 *    Propostas.jsx escreviam o número mágico "/124" direto no texto. Se a regra mudar no back,
 *    havia 4 lugares para lembrar de trocar.
 *
 * 3. plural: só existia em Mercado.jsx, enquanto Anunciar.jsx e Layout.jsx refaziam a mesma
 *    escolha singular/plural na mão (`proposta`/`propostas`, `Pokébola`/`Pokébolas`).
 */

/** Soma os valores de um objeto, ex.: os 4 IVs ou os 4 status de um card */
export const somaValores = (objeto) => Object.values(objeto).reduce((soma, valor) => soma + valor, 0);

// Soma máxima dos IVs: 4 status x 31
export const IV_TOTAL_MAXIMO = 124;

// "1 anúncio", "1.500 Pokécoins"
export const plural = (n, singular, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : varios}`;

/**
 * Resumo da evolução para cards e o time: "Evolui no Nv. 36 (faltam 4)", "Pode evoluir!" ou null se não evolui.
 * Com várias evoluções (Eevee), vale a de menor nível.
 */
export function resumoEvolucao(pokemon) {
  if (pokemon.evolucoes.length === 0) return null;
  const disponivel = pokemon.evolucoes.find((e) => e.disponivel);
  if (disponivel) return { pronto: true, texto: `Pode evoluir para ${formatarNome(disponivel.nome)}!` };
  const proxima = pokemon.evolucoes.reduce((menor, e) => (e.nivel < menor.nivel ? e : menor));
  const faltam = proxima.nivel - pokemon.nivel;
  return {
    pronto: false,
    texto: `Evolui para ${formatarNome(proxima.nome)} no Nv. ${proxima.nivel} (falta${faltam === 1 ? '' : 'm'} ${faltam})`,
  };
}

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
