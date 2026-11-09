import { useState } from 'react';
import { lerFiltros, salvarFiltros } from '../models/index_models';

/* [DRY] Novo. Time e MeusPokemons tinham o mesmo trecho:
 *   const [filtros, setFiltros] = useState(() => lerFiltros(CHAVE_FILTROS));
 *   const mudarFiltros = (novos) => { setFiltros(novos); salvarFiltros(CHAVE_FILTROS, novos); };
 * Só a chave mudava, e agora ela é o parâmetro.
 */

/** Filtros da coleção salvos neste navegador. Cada tela usa a sua chave. */
export function useFiltrosColecao(chave) {
  const [filtros, setFiltros] = useState(() => lerFiltros(chave));

  const mudarFiltros = (novos) => {
    setFiltros(novos);
    salvarFiltros(chave, novos);
  };

  return [filtros, mudarFiltros];
}
