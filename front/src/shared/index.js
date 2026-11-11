// Fachada do shared: design system e utilitários usados por mais de uma feature.
// As features importam daqui (@/shared), nunca de shared/<pasta>/... diretamente.

// Componentes
export { default as Avatar } from './components/Avatar';
export { default as BarraProgresso } from './components/BarraProgresso';
export { default as CartaPokemon } from './components/CartaPokemon';
export { default as Coracoes } from './components/Coracoes';
export { BotoesGolpes, ListaGolpes } from './components/Golpes';
export { default as Layout } from './components/Layout';
export { default as StatusOnline } from './components/StatusOnline';
export { default as TabelaTipos } from './components/TabelaTipos';
export { default as Tutorial } from './components/Tutorial';
export { default as VantagensTipo } from './components/VantagensTipo';

// Hooks
export { useAcao } from './hooks/index_hooks';

// Regras, constantes e contratos de dados
export { temTimeCompleto } from './models/index_models';
export {
  GERACOES, IV_TOTAL_MAXIMO, TAMANHO_TIME, TIPOS,
} from './constants/index_constants';
export { formatoPokemon } from './types/index_types';

// Utilitários
export {
  carregar, dadosTipo, formatarNome, formatarNumero, nomesTipos, plural, resumoEvolucao, somaValores,
  tempoDesde, tempoRestante, urlArtwork, urlSprite,
} from './utils/index_utils';
