import { useState } from 'react';
import * as api from '../../services/index_services';
import { GERACOES } from '@/shared';
import { useSessao } from '@/features/auth';
import { PRECO_POKEMON } from '../../constants/index_constants';

/* [MVVM] Novo. ViewModel da Loja (./index.jsx): compra por geração.
 * [SOLID-S] As ações comprarPokemon e comprarPokebolas estavam escritas no App; agora ficam aqui.
 * [SOLID-S] A compra de Pokébolas (useLojaPokebolas) foi para ../LojaPokebolas/index_viewmodels.js.
 * [DRY] Preços vêm de ../../constants e GERACOES de @/shared (GERACOES estava copiada na Vitrine).
 */

export { GERACOES, PRECO_POKEMON };

/** Compra de Pokémon por geração. Guarda os cards comprados nesta visita. */
export function useLojaViewModel() {
  const { usuario, executarEAtualizar } = useSessao();
  // Número da geração em sorteio agora (null quando nenhuma)
  const [comprando, setComprando] = useState(null);
  const [erro, setErro] = useState(null);
  // Os cards comprados nesta visita, do mais novo para o mais antigo
  const [comprados, setComprados] = useState([]);
  // Card recém-comprado em destaque no meio da tela (null quando fechado)
  const [revelado, setRevelado] = useState(null);

  const comprar = async (numeroGeracao) => {
    setComprando(numeroGeracao);
    setErro(null);
    try {
      const { pokemon } = await executarEAtualizar(() => api.comprarPokemon(numeroGeracao));
      setComprados((atual) => [pokemon, ...atual]);
      setRevelado(pokemon);
    } catch (e) {
      setErro(e.message);
    } finally {
      setComprando(null);
    }
  };

  return {
    saldo: usuario.pokecoins,
    podeComprar: usuario.pokecoins >= PRECO_POKEMON,
    comprando,
    erro,
    revelado,
    fecharRevelado: () => setRevelado(null),
    comprados,
    comprar,
  };
}
