import { useState } from 'react';
import { GERACOES } from '@/shared';

/* [MVVM] ViewModel do Album. Era o useAlbum, exportado junto com os outros hooks da Vitrine em
 * viewmodels/useVitrineViewModel.
 */

// [DRY] Regiões do álbum: os mesmos intervalos da Pokédex das lojas. Antes a Vitrine tinha a sua
// própria lista REGIOES, igual a GERACOES da Loja.
const REGIOES = GERACOES.map(({ regiao, primeira, ultima }) => ({ nome: regiao, inicio: primeira, fim: ultima }));

/** Álbum de espécies por região: abre na região onde o treinador tem mais espécies */
export function useAlbum(colecao) {
  const possuidas = new Map(colecao.map((especie) => [especie.id, especie]));
  const [regiaoIndice, setRegiaoIndice] = useState(() => {
    const totais = REGIOES.map(({ inicio, fim }) => colecao.filter(({ id }) => id >= inicio && id <= fim).length);
    return totais.indexOf(Math.max(...totais));
  });
  const regiao = REGIOES[regiaoIndice];
  const ids = Array.from({ length: regiao.fim - regiao.inicio + 1 }, (_, i) => regiao.inicio + i);

  return {
    regioes: REGIOES,
    regiaoIndice,
    setRegiaoIndice,
    regiao,
    ids,
    naRegiao: ids.filter((id) => possuidas.has(id)).length,
    especieDe: (id) => possuidas.get(id),
  };
}
