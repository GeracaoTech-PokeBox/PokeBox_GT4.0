import { useState } from 'react';
import { CRITERIOS } from '../../constants/index_constants';
import { recortar } from '../../utils/index_utils';

/* [MVVM] ViewModel dos critérios de avaliação: qual card está aberto e os recortes de código
 * já prontos para mostrar. A View não sabe de onde vem o código nem como ele é recortado.
 */

// Os recortes não mudam enquanto o app roda: calcula uma vez só
const CRITERIOS_COM_RECORTES = CRITERIOS.map((criterio) => ({
  ...criterio,
  exemplos: criterio.exemplos.map(({
    arquivo, fonte, marcador, antes, depois, explicacao,
  }) => ({
    arquivo,
    explicacao,
    recorte: recortar(fonte, marcador, { antes, depois }),
  })),
}));

/** Cards dos critérios; abrir o mesmo card de novo fecha */
export function useCriteriosViewModel() {
  const [abertoId, setAbertoId] = useState(null);

  return {
    criterios: CRITERIOS_COM_RECORTES,
    abertoId,
    aberto: CRITERIOS_COM_RECORTES.find(({ id }) => id === abertoId) ?? null,
    alternar: (id) => setAbertoId((atual) => (atual === id ? null : id)),
  };
}
