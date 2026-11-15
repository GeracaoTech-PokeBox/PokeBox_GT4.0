import { useState } from 'react';
import * as api from '../../services/index_services';
import { GERACOES, menuLiberado, TAMANHO_TIME } from '@/shared';
import { useSessao } from '@/features/auth';
import { PRECO_POKEBOLA, PRECO_POKEMON } from '../../constants/index_constants';

/* [MVVM] Novo. ViewModel da Loja (./index.jsx): compra por geração.
 * [SOLID-S] As ações comprarPokemon e comprarPokebolas estavam escritas no App; agora ficam aqui.
 * [SOLID-S] A compra de Pokébolas (useLojaPokebolas) foi para ../LojaPokebolas/index_viewmodels.js.
 * [DRY] Preços vêm de ../../constants e GERACOES de @/shared (GERACOES estava copiada na Vitrine).
 */

export { GERACOES, PRECO_POKEBOLA, PRECO_POKEMON };

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
  // Card da loja aberto: 'pokebolas', 'pokemons' ou null (os dois fechados)
  const [secaoAberta, setSecaoAberta] = useState(null);

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
    pokebolas: usuario.pokebolas ?? 0,
    secaoAberta,
    alternarSecao: (secao) => setSecaoAberta((atual) => (atual === secao ? null : secao)),
    podeComprar: usuario.pokecoins >= PRECO_POKEMON,
    // A tela Time libera com o time completo (mesma regra do menu): até lá, o botão fica desativado
    podeIrParaTime: menuLiberado(usuario.pokemons),
    faltamParaTime: Math.max(TAMANHO_TIME - usuario.pokemons.length, 0),
    comprando,
    erro,
    revelado,
    fecharRevelado: () => setRevelado(null),
    comprados,
    comprar,
  };
}
