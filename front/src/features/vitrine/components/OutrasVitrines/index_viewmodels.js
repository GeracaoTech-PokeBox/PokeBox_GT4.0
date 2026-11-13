import { useEffect, useState } from 'react';
import * as api from '../../services/index_services';

/* [MVVM] ViewModel do OutrasVitrines. Era o useBuscaVitrines, exportado junto com os outros
 * hooks da Vitrine em viewmodels/useVitrineViewModel.
 */

/** Lista de vitrines de outros treinadores, com busca por login */
export function useBuscaVitrines() {
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState(null);

  useEffect(() => {
    let ativo = true;
    // Espera parar de digitar para não buscar a cada letra
    const espera = setTimeout(() => {
      api.listarVitrines(busca.trim()).then((resposta) => {
        if (ativo) setLista(resposta);
      }, () => {
        if (ativo) setLista([]);
      });
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [busca]);

  return { busca, setBusca, lista };
}
