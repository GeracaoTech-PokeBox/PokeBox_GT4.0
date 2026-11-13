// Fachada da feature colecao: a coleção do treinador (Meus Pokémon)
export { default as MeusPokemons } from './components/MeusPokemons';

// Filtros da coleção, reaproveitados pela feature time
export { default as FiltrosColecao } from './components/FiltrosColecao';
export { useFiltrosColecao } from './hooks/index_hooks';
export { filtrarEOrdenar, tiposDaColecao } from './models/index_models';
