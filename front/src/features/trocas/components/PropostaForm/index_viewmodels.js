import { useState } from 'react';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';
import { POKEMONS_POR_PROPOSTA } from '../../constants/index_constants';

/* [MVVM] Novo. ViewModel do PropostaForm: seleção, Pokécoins, validação e envio da proposta.
 * [SOLID-I] O form recebia o objeto `usuario` inteiro do Mercado; agora lê só o que usa (saldo e
 *   Pokémon fora do time) com useSessao().
 * [KISS] As três condições do botão "Enviar proposta" viraram um valor só, podeEnviar.
 * [DRY] POKEMONS_POR_PROPOSTA vem de ../../constants.
 */

export { POKEMONS_POR_PROPOSTA };

/** Oferta (Pokémon da coleção + Pokécoins) para um anúncio que aceita propostas */
export function usePropostaFormViewModel(anuncio, onEnviada) {
  const { usuario } = useSessao();
  const [selecionados, setSelecionados] = useState([]);
  const [pokecoins, setPokecoins] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  // Pokémon do time de batalha não podem ser trocados
  const disponiveis = usuario.pokemons.filter((p) => !p.posicaoTime);
  const oferecidos = disponiveis.filter((p) => selecionados.includes(p.id));
  const moedas = Number(pokecoins) || 0;

  const alternar = (id) => {
    setSelecionados((atual) => {
      if (atual.includes(id)) return atual.filter((outro) => outro !== id);
      return atual.length < POKEMONS_POR_PROPOSTA ? [...atual, id] : atual;
    });
  };

  const enviar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await api.proporTroca(anuncio.id, { pokemonIds: selecionados, pokecoins: moedas });
      onEnviada();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  };

  return {
    disponiveis,
    oferecidos,
    estaSelecionado: (id) => selecionados.includes(id),
    quantidadeSelecionados: selecionados.length,
    cheio: selecionados.length >= POKEMONS_POR_PROPOSTA,
    alternar,
    saldo: usuario.pokecoins,
    pokecoins,
    setPokecoins,
    moedas,
    podeEnviar: !enviando && (oferecidos.length > 0 || moedas > 0) && moedas <= usuario.pokecoins,
    enviando,
    erro,
    enviar,
  };
}
