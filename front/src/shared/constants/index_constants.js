/* Constantes usadas por mais de uma feature. As regras que só uma feature usa (preços da loja,
 * limites da vitrine, das trocas e da história) foram para constants/ ou models/ da feature.
 * Todas espelham back/src/jogo/config.js: se uma mudar lá, mude aqui também.
 */

// Nome em português e cor de cada tipo (usado pelos cards da Pokédex e da coleção)
export const TIPOS = {
  normal: { nome: 'Normal', cor: '#a8a77a' },
  fire: { nome: 'Fogo', cor: '#ee8130' },
  water: { nome: 'Água', cor: '#6390f0' },
  grass: { nome: 'Planta', cor: '#7ac74c' },
  electric: { nome: 'Elétrico', cor: '#f7d02c' },
  ice: { nome: 'Gelo', cor: '#96d9d6' },
  fighting: { nome: 'Lutador', cor: '#c22e28' },
  poison: { nome: 'Venenoso', cor: '#a33ea1' },
  ground: { nome: 'Terrestre', cor: '#e2bf65' },
  flying: { nome: 'Voador', cor: '#a98ff3' },
  psychic: { nome: 'Psíquico', cor: '#f95587' },
  bug: { nome: 'Inseto', cor: '#a6b91a' },
  rock: { nome: 'Pedra', cor: '#b6a136' },
  ghost: { nome: 'Fantasma', cor: '#735797' },
  dragon: { nome: 'Dragão', cor: '#6f35fc' },
  dark: { nome: 'Sombrio', cor: '#705746' },
  steel: { nome: 'Aço', cor: '#b7b7ce' },
  fairy: { nome: 'Fada', cor: '#d685ad' },
};

// Mesma tabela do back (back/src/jogo/tipos.js): para cada tipo de golpe, contra quem ele é
// super efetivo (2x), pouco efetivo (0,5x) ou não tem efeito (0x)
export const EFETIVIDADE = {
  normal: { forte: [], fraco: ['rock', 'steel'], nulo: ['ghost'] },
  fire: { forte: ['grass', 'ice', 'bug', 'steel'], fraco: ['fire', 'water', 'rock', 'dragon'], nulo: [] },
  water: { forte: ['fire', 'ground', 'rock'], fraco: ['water', 'grass', 'dragon'], nulo: [] },
  electric: { forte: ['water', 'flying'], fraco: ['electric', 'grass', 'dragon'], nulo: ['ground'] },
  grass: {
    forte: ['water', 'ground', 'rock'],
    fraco: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
    nulo: [],
  },
  ice: { forte: ['grass', 'ground', 'flying', 'dragon'], fraco: ['fire', 'water', 'ice', 'steel'], nulo: [] },
  fighting: {
    forte: ['normal', 'ice', 'rock', 'dark', 'steel'],
    fraco: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    nulo: ['ghost'],
  },
  poison: { forte: ['grass', 'fairy'], fraco: ['poison', 'ground', 'rock', 'ghost'], nulo: ['steel'] },
  ground: { forte: ['fire', 'electric', 'poison', 'rock', 'steel'], fraco: ['grass', 'bug'], nulo: ['flying'] },
  flying: { forte: ['grass', 'fighting', 'bug'], fraco: ['electric', 'rock', 'steel'], nulo: [] },
  psychic: { forte: ['fighting', 'poison'], fraco: ['psychic', 'steel'], nulo: ['dark'] },
  bug: {
    forte: ['grass', 'psychic', 'dark'],
    fraco: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
    nulo: [],
  },
  rock: { forte: ['fire', 'ice', 'flying', 'bug'], fraco: ['fighting', 'ground', 'steel'], nulo: [] },
  ghost: { forte: ['psychic', 'ghost'], fraco: ['dark'], nulo: ['normal'] },
  dragon: { forte: ['dragon'], fraco: ['steel'], nulo: ['fairy'] },
  dark: { forte: ['psychic', 'ghost'], fraco: ['fighting', 'dark', 'fairy'], nulo: [] },
  steel: { forte: ['ice', 'rock', 'fairy'], fraco: ['fire', 'water', 'electric', 'steel'], nulo: [] },
  fairy: { forte: ['fighting', 'dragon', 'dark'], fraco: ['fire', 'poison', 'steel'], nulo: [] },
};

// Soma máxima dos IVs: 4 status x 31
export const IV_TOTAL_MAXIMO = 124;

// Pokémon no time de batalha
export const TAMANHO_TIME = 3;

// Uma geração por loja/região, com o intervalo de números da Pokédex (config.GERACOES)
export const GERACOES = [
  { numero: 1, regiao: 'Kanto', primeira: 1, ultima: 151 },
  { numero: 2, regiao: 'Johto', primeira: 152, ultima: 251 },
  { numero: 3, regiao: 'Hoenn', primeira: 252, ultima: 386 },
  { numero: 4, regiao: 'Sinnoh', primeira: 387, ultima: 493 },
  { numero: 5, regiao: 'Unova', primeira: 494, ultima: 649 },
  { numero: 6, regiao: 'Kalos', primeira: 650, ultima: 721 },
  { numero: 7, regiao: 'Alola', primeira: 722, ultima: 809 },
  { numero: 8, regiao: 'Galar', primeira: 810, ultima: 905 },
  { numero: 9, regiao: 'Paldea', primeira: 906, ultima: 1025 },
];
