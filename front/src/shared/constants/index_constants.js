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
