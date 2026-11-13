import { useState } from 'react';
import { plural } from '@/shared';
import { useSessao } from '@/features/auth';
import * as api from '../../services/index_services';
import { PRECO_POKEBOLA } from '../../constants/index_constants';

/* [MVVM] ViewModel do LojaPokebolas. Era o useLojaPokebolas, exportado junto com o useLojaViewModel.
 * [SOLID-I] LojaPokebolas não recebe o objeto `usuario` inteiro nem a ação por props: este hook
 *   entrega só pokebolas, podePagar e comprar.
 */

export { PRECO_POKEBOLA };
export const PACOTES_POKEBOLA = [1, 5, 10];

/** Pokébolas: usadas para capturar os Pokémon derrotados na história */
export function useLojaPokebolas() {
  const { usuario, executarEAtualizar } = useSessao();
  // Quantidade sendo comprada agora (null quando nenhuma)
  const [comprando, setComprando] = useState(null);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  const comprar = async (quantidade) => {
    setComprando(quantidade);
    setErro(null);
    setAviso(null);
    try {
      await executarEAtualizar(() => api.comprarPokebolas(quantidade));
      // [DRY] A escolha "Pokébola"/"Pokébolas" era feita na mão; agora usa plural() de @/shared.
      // Código original: setAviso(`${quantidade} Pokébola${quantidade === 1 ? '' : 's'} na mochila!`);
      setAviso(`${plural(quantidade, 'Pokébola', 'Pokébolas')} na mochila!`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setComprando(null);
    }
  };

  return {
    pokebolas: usuario.pokebolas ?? 0,
    podePagar: (quantidade) => usuario.pokecoins >= quantidade * PRECO_POKEBOLA,
    comprando,
    erro,
    aviso,
    comprar,
  };
}
