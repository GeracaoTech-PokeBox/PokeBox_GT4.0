import { useState } from 'react';
import { CRITERIOS } from '../../constants/index_constants';
import { agruparPorTag } from '../../models/index_models';
import { lerFontes } from '../../services/index_services';

/* [MVVM] ViewModel dos critérios de avaliação: os casos de cada critério, lidos do código-fonte,
 * e qual card está aberto. A View não sabe de onde vêm os casos nem como eles são extraídos.
 */

const TAMANHO_RESUMO = 140;

// Primeira frase da explicação, para a linha fechada de cada caso
function resumir(explicacao) {
  const primeira = explicacao.split('\n')[0].match(/^.*?[.!?:](?=\s|$)/)?.[0] ?? explicacao.split('\n')[0];
  return primeira.length > TAMANHO_RESUMO ? `${primeira.slice(0, TAMANHO_RESUMO - 1)}…` : primeira;
}

// O código não muda enquanto o app roda: extrai os casos uma vez só
const CASOS_POR_TAG = agruparPorTag(lerFontes());
const CRITERIOS_COM_CASOS = CRITERIOS.map((criterio) => {
  const casos = CASOS_POR_TAG[criterio.id].map((caso) => ({ ...caso, resumo: resumir(caso.explicacao) }));
  return {
    ...criterio,
    casos,
    comAntesEDepois: casos.filter(({ antes, depois }) => antes && depois).length,
  };
});

/** Cards dos critérios; abrir o mesmo card de novo fecha */
export function useCriteriosViewModel() {
  const [abertoId, setAbertoId] = useState(null);

  return {
    criterios: CRITERIOS_COM_CASOS,
    abertoId,
    aberto: CRITERIOS_COM_CASOS.find(({ id }) => id === abertoId) ?? null,
    alternar: (id) => setAbertoId((atual) => (atual === id ? null : id)),
  };
}
