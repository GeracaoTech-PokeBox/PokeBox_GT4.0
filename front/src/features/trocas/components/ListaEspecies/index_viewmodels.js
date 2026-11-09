import { useEffect, useState } from 'react';
import { carregar } from '@/shared';
import * as api from '../../services/index_services';

/* [MVVM] ViewModel do ListaEspecies: busca com espera de 250ms e ordenação. Era o
 * useListaEspecies, exportado junto com o useAnunciosDaEspecie em viewmodels/useMercadoViewModel.
 */

/** Primeira tela do mercado: espécies anunciadas, com busca e ordenação */
export function useListaEspecies() {
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('popularidade');
  const [especies, setEspecies] = useState(null);
  const [erro, setErro] = useState(null);

  /* [DRY] O controle "let ativo = true ... ativo = false" era o mesmo das outras telas;
   * agora usa carregar(). O debounce de 250 ms continua igual.
   *
   * Código original:
   *
   * useEffect(() => {
   *   let ativo = true;
   *   // Espera parar de digitar para não buscar a cada letra
   *   const espera = setTimeout(() => {
   *     api.listarMercado(busca.trim().toLowerCase().replace(/\s+/g, '-'), ordem).then((lista) => {
   *       if (ativo) {
   *         setEspecies(lista);
   *         setErro(null);
   *       }
   *     }, (e) => {
   *       if (ativo) setErro(e.message);
   *     });
   *   }, 250);
   *   return () => {
   *     ativo = false;
   *     clearTimeout(espera);
   *   };
   * }, [busca, ordem]);
   */
  useEffect(() => {
    let cancelar = () => {};
    // Espera parar de digitar para não buscar a cada letra
    const espera = setTimeout(() => {
      cancelar = carregar(
        api.listarMercado(busca.trim().toLowerCase().replace(/\s+/g, '-'), ordem),
        (lista) => {
          setEspecies(lista);
          setErro(null);
        },
        (e) => setErro(e.message),
      );
    }, 250);
    return () => {
      clearTimeout(espera);
      cancelar();
    };
  }, [busca, ordem]);

  return {
    busca, setBusca, ordem, setOrdem, especies, erro,
  };
}

