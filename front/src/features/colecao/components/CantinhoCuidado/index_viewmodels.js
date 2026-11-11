import { useEffect, useState } from 'react';
import { carregar, tempoDesde, tempoRestante, formatarNome } from '@/shared';
import * as api from '../../services/index_services';

/* [MVVM] Novo. ViewModel do CantinhoCuidado: histórico, relógio de 30s, regras de espera e
 *   cansaço, humor e a reação depois de cada cuidado.
 *   A roleta e o desbloqueio dos golpes (useCartaoGolpes) foram para ../CartaoGolpes/index_viewmodels.js.
 * [SOLID-S] A View recebe cada botão de cuidado pronto ({ detalhe, desabilitado }) e não refaz as
 *   contas de espera e energia.
 * [SOLID-D] cuidar/roletar/desbloquear continuam chegando por parâmetro, vindos do ViewModel de
 *   MeusPokemons: este hook não sabe como elas falam com o back.
 */

// Mesmos valores de back/src/jogo/config.js (CUIDADOS), para os textos dos botões
const CUIDADOS = [
  { tipo: 'carinho', nome: 'Carinho', icone: '🤲', efeitos: '+10 afeto · +15 humor', energia: 0, espera: '2h' },
  { tipo: 'brincar', nome: 'Brincar', icone: '🎾', efeitos: '+20 afeto · +25 humor · −25 energia', energia: -25, espera: '4h' },
  { tipo: 'alimentar', nome: 'Alimentar', icone: '🍓', efeitos: '+20 afeto · +35 energia', energia: 35, espera: '4h' },
];

// Barras abaixo disto ficam vermelhas
export const BEM_ESTAR_BAIXO = 25;

// Atualiza os contadores de espera dos botões
const RELOGIO_MS = 30 * 1000;

const REACOES = {
  carinho: (nome) => `${nome} fechou os olhos e curtiu o carinho.`,
  brincar: (nome) => `${nome} correu atrás da bolinha todo animado!`,
  alimentar: (nome) => `${nome} comeu tudo e ficou te olhando, pedindo mais.`,
};

const PASSADO = { carinho: 'ganhou carinho', brincar: 'brincou com você', alimentar: 'comeu uma frutinha' };

// Como o Pokémon está com você, pelo número de corações
const HUMORES = ['está tímido', 'está curioso com você', 'está curioso com você', 'está feliz', 'está feliz', 'confia totalmente em você'];

// Cansaço e tédio falam mais alto que o afeto
function descreverHumor(pokemon) {
  if (pokemon.energia < BEM_ESTAR_BAIXO) return 'está cansado e com fome';
  if (pokemon.humor < BEM_ESTAR_BAIXO) return 'está entediado';
  return HUMORES[pokemon.afeto.coracoes];
}

/** Cantinho de cuidado de um Pokémon. onCuidar(pokemonId, tipo) faz o cuidado e atualiza o usuário. */
export function useCantinhoCuidadoViewModel(pokemon, onCuidar) {
  const nome = formatarNome(pokemon.nome);
  const [historico, setHistorico] = useState([]);
  const [reacao, setReacao] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [agora, setAgora] = useState(Date.now);
  // Muda a cada cuidado para reiniciar a animação dos corações subindo
  const [animacao, setAnimacao] = useState(0);

  /* [DRY] Mesmo bloco "let ativo = true ... ativo = false" das outras telas; agora é carregar().
   * Os erros continuam ignorados (o histórico é só informativo).
   *
   * Código original:
   *
   * useEffect(() => {
   *   let ativo = true;
   *   api.listarCuidados(pokemon.id).then((lista) => {
   *     if (ativo) setHistorico(lista);
   *   }, () => {});
   *   return () => {
   *     ativo = false;
   *   };
   * }, [pokemon.id]);
   */
  useEffect(() => carregar(api.listarCuidados(pokemon.id), setHistorico), [pokemon.id]);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), RELOGIO_MS);
    return () => clearInterval(relogio);
  }, []);

  const cuidar = async (tipo) => {
    setEnviando(true);
    setErro(null);
    try {
      const coracoesAntes = pokemon.afeto.coracoes;
      const { pokemon: atualizado, ganho, pokecoins } = await onCuidar(pokemon.id, tipo);
      let texto = ganho > 0 ? REACOES[tipo](nome) : `${nome} já te adora o máximo possível!`;
      if (atualizado.afeto.coracoes > coracoesAntes) {
        texto += atualizado.afeto.maximo
          ? ` Afeto máximo! Agora ${nome} pode aguentar firme um golpe letal nas batalhas e aprender golpes especiais.`
          : ' Vocês ganharam um novo coração!';
      }
      // Cada coração completado paga Pokécoins (uma vez por coração do card)
      if (pokecoins > 0) texto += ` Você ganhou ${pokecoins} Pokécoins!`;
      setReacao(texto);
      setAnimacao((n) => n + 1);
      setHistorico(await api.listarCuidados(pokemon.id));
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const { afeto } = pokemon;

  return {
    nome,
    humor: descreverHumor(pokemon),
    reacao: reacao ?? `Que tal dar um pouco de atenção para ${nome}?`,
    erro,
    animacao,
    // Um botão por cuidado, já com o texto de espera e se pode ser usado agora
    acoes: CUIDADOS.map(({
      tipo, nome: rotulo, icone, efeitos, energia, espera,
    }) => {
      const disponivelEm = pokemon.cuidadosDisponiveisEm[tipo];
      const esperando = Boolean(disponivelEm) && new Date(disponivelEm).getTime() > agora;
      const cansado = pokemon.energia + energia < 0;
      let detalhe = `${efeitos} · a cada ${espera}`;
      if (esperando) detalhe = `Disponível em ${tempoRestante(disponivelEm, agora)}`;
      else if (cansado) detalhe = 'Sem energia: alimente primeiro';
      return {
        tipo, rotulo, icone, detalhe, desabilitado: enviando || esperando || cansado,
      };
    }),
    cuidar,
    // [KISS] "((x % 100) / 100) * 100" divide e multiplica por 100 à toa: o resultado é só x % 100.
    progresso: afeto.maximo ? 100 : afeto.pontos % 100,
    historico: historico.map((item) => ({
      chave: `${item.criadoEm}-${item.tipo}`,
      texto: `${nome} ${PASSADO[item.tipo]}${item.afeto > 0 ? ` (+${item.afeto})` : ''}`,
      criadoEm: item.criadoEm,
      quando: tempoDesde(item.criadoEm, agora),
    })),
  };
}
