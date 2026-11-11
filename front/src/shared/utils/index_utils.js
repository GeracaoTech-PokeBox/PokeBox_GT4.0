/* Utilitários de exibição usados por várias features. Juntou o que eram models/tipos,
 * models/formatos, models/tempo, viewmodels/carregar e os endereços de imagem de models/pokeapi.
 * As constantes foram para shared/constants e o formatoPokemon para shared/types.
 */
import { EFETIVIDADE, TIPOS } from '../constants/index_constants';

// ---------------------------------------------------------------- tipos
// [YAGNI] Era exportada só para PokemonCard.jsx refazer a lógica de dadosTipo(). Agora que
// PokemonCard usa dadosTipo(), nenhum outro arquivo precisa importar esta constante.
// export const TIPO_DESCONHECIDO = { nome: '???', cor: '#68a090' };
const TIPO_DESCONHECIDO = { nome: '???', cor: '#68a090' };

export const dadosTipo = (tipo) => TIPOS[tipo] ?? TIPO_DESCONHECIDO;

// [DRY] Novo: Mercado.jsx (2x) e pages/Vitrine.jsx montavam este texto com o mesmo map + join.
// ['fire', 'flying'] -> "Fogo / Voador"
export const nomesTipos = (tipos) => tipos.map((tipo) => dadosTipo(tipo).nome).join(' / ');

// Multiplicador de um golpe contra um Pokémon com esses tipos (os dois tipos se multiplicam)
function efetividade(tipoGolpe, tiposAlvo) {
  const linha = EFETIVIDADE[tipoGolpe];
  return tiposAlvo.reduce((total, tipo) => {
    if (linha.nulo.includes(tipo)) return 0;
    if (linha.forte.includes(tipo)) return total * 2;
    if (linha.fraco.includes(tipo)) return total * 0.5;
    return total;
  }, 1);
}

/** Tipos contra os quais os golpes do Pokémon são super efetivos (vantagem) */
export const vantagensDe = (tipos) => Object.keys(TIPOS).filter(
  (alvo) => tipos.some((tipo) => EFETIVIDADE[tipo]?.forte.includes(alvo)),
);

/** Tipos de golpe que causam dano dobrado (ou mais) no Pokémon (desvantagem) */
export const fraquezasDe = (tipos) => Object.keys(TIPOS).filter(
  (golpe) => efetividade(golpe, tipos) >= 2,
);

// "lightning-rod" -> "Lightning Rod"
export function formatarNome(nome) {
  return nome
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

export function formatarNumero(numero) {
  return `#${String(numero).padStart(4, '0')}`;
}

// ---------------------------------------------------------------- formatos
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

// Só a palavra, no singular ou no plural: "Pokébola", "Pokébolas"
export const flexionar = (n, singular, varios) => (n === 1 ? singular : varios);

// "1 anúncio", "1.500 Pokécoins"
export const plural = (n, singular, varios) => `${n.toLocaleString('pt-BR')} ${flexionar(n, singular, varios)}`;

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

// ---------------------------------------------------------------- tempo
// "3h 12min", "45min", "38s" ou "0s" até a data informada
export function tempoRestante(data, agora = Date.now()) {
  // Com o prazo de 1 min por jogada, os segundos importam: "38s" em vez de "menos de 1 min"
  const segundos = Math.max(Math.floor((new Date(data).getTime() - agora) / 1000), 0);
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  return horas > 0 ? `${horas}h ${minutos % 60}min` : `${minutos}min`;
}

// "agora há pouco", "há 25 min" ou "há 3h" desde a data informada
export function tempoDesde(data, agora = Date.now()) {
  const minutos = Math.floor((agora - new Date(data).getTime()) / 60000);
  if (minutos < 5) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)}h`;
}

// ---------------------------------------------------------------- imagens da PokeAPI
const SPRITES_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const ARTWORK_URL = `${SPRITES_URL}/other/official-artwork`;

// Arte oficial pelo número, sem precisar buscar o Pokémon inteiro
export function urlArtwork(id, shiny = false) {
  return shiny ? `${ARTWORK_URL}/shiny/${id}.png` : `${ARTWORK_URL}/${id}.png`;
}

// Sprite pequeno (96px), mais leve para grades com muitos Pokémon, como o álbum da vitrine
export function urlSprite(id, shiny = false) {
  return shiny ? `${SPRITES_URL}/shiny/${id}.png` : `${SPRITES_URL}/${id}.png`;
}

// ---------------------------------------------------------------- carregar
/* [DRY] Arquivo novo. Anunciar, CantinhoCuidado, FiltrosPokemons, Mercado (2x) e Propostas
 * repetiam o mesmo bloco dentro do useEffect para não atualizar o estado de um componente que
 * já saiu da tela:
 *
 *   let ativo = true;
 *   api.algumaCoisa().then((dados) => {
 *     if (ativo) setDados(dados);
 *   }, (e) => {
 *     if (ativo) setErro(e.message);
 *   });
 *   return () => {
 *     ativo = false;
 *   };
 *
 * São 8 linhas de "tunel" por tela, iguais exceto pela promessa e pelos setters.
 * Centralizar aqui deixa cada useEffect com uma linha e garante que todos tratam o
 * "componente desmontado" do mesmo jeito.
 */

/**
 * Repassa o resultado da promessa para os callbacks enquanto o efeito estiver ativo.
 * Devolve a função de limpeza do useEffect: `useEffect(() => carregar(...), [deps])`.
 */
export function carregar(promessa, onSucesso, onErro = () => {}) {
  let ativo = true;
  promessa.then((dados) => {
    if (ativo) onSucesso(dados);
  }, (erro) => {
    if (ativo) onErro(erro);
  });
  return () => {
    ativo = false;
  };
}
