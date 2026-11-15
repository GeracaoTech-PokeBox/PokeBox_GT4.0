import { useEffect, useState } from 'react';
import { filtrarEOrdenar, tiposDaColecao, useFiltrosColecao } from '@/features/colecao';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';
import { TAMANHO_TIME } from '@/shared';

/* [MVVM] Novo. ViewModel do Time (./index.jsx): escolher, reordenar e salvar os 3 Pokémon.
 * [SOLID-S] onSalvar estava escrito no App; agora salvar() fica aqui, junto do resto da tela.
 * [DRY] Os filtros salvos no navegador eram o mesmo código de MeusPokemons; agora os dois usam
 *   useFiltrosColecao(). TAMANHO_TIME vem de @/shared.
 * [KISS] A View recebe prontos `vagas`, `faltam`, `cheio` e `podeSalvar`, sem refazer as contas.
 */

export { TAMANHO_TIME };
// Filtro próprio desta tela, salvo neste navegador (separado do de Meus Pokémon)
const CHAVE_FILTROS = 'pokebox-filtros-time';

const timeAtual = (pokemons) => pokemons
  .filter((p) => p.posicaoTime)
  .sort((a, b) => a.posicaoTime - b.posicaoTime)
  .map((p) => p.id);

/**
 * Montagem do time: escolher, reordenar e salvar os 3 Pokémon que batalham
 * @param {(alterado: boolean) => void} onAlterado avisa o App se há mudanças não salvas,
 *   para ele perguntar antes de trocar de tela
 */
export function useTimeViewModel(onAlterado) {
  const { usuario, executarEAtualizar } = useSessao();
  const { pokemons } = usuario;
  // Ids na ordem escolhida (o primeiro abre a batalha)
  const [selecionados, setSelecionados] = useState(() => timeAtual(pokemons));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [filtros, mudarFiltros] = useFiltrosColecao(CHAVE_FILTROS);

  // Escolha ou ordem diferente da salva
  const alterado = selecionados.join() !== timeAtual(pokemons).join();

  useEffect(() => {
    onAlterado(alterado);
    if (!alterado) return undefined;
    // Recarregar ou fechar a aba: o navegador mostra o aviso dele ("Sair do site?")
    const avisar = (e) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => {
      window.removeEventListener('beforeunload', avisar);
      onAlterado(false);
    };
  }, [alterado, onAlterado]);

  const porId = new Map(pokemons.map((p) => [p.id, p]));
  // "Só do time" olha o time sendo montado na tela, mesmo antes de salvar
  const comPosicaoAtual = pokemons.map((p) => {
    const posicao = selecionados.indexOf(p.id);
    return { ...p, posicaoTime: posicao === -1 ? null : posicao + 1 };
  });

  const alternar = (id) => {
    setAviso(null);
    setSelecionados((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id);
      if (atual.length >= TAMANHO_TIME) return atual;
      return [...atual, id];
    });
  };

  // Troca duas vagas de lugar. Soltar numa vaga vazia leva o Pokémon para a última ocupada.
  const trocar = (origem, destino) => {
    setAviso(null);
    setSelecionados((atual) => {
      const novo = [...atual];
      const alvo = Math.min(destino, novo.length - 1);
      [novo[origem], novo[alvo]] = [novo[alvo], novo[origem]];
      return novo;
    });
  };

  // [DRY] Os botões ◀ ▶ são a mesma troca, com a vaga ao lado
  const mover = (indice, direcao) => trocar(indice, indice + direcao);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await executarEAtualizar(() => api.salvarTime(selecionados));
      setAviso('Time salvo! Ele vale para os próximos desafios que você aceitar ou enviar.');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return {
    totalNaColecao: pokemons.length,
    colecaoPequena: pokemons.length < TAMANHO_TIME,
    // Um item por vaga do time: o Pokémon escolhido ou undefined
    vagas: Array.from({ length: TAMANHO_TIME }, (_, i) => porId.get(selecionados[i])),
    selecionados,
    faltam: TAMANHO_TIME - selecionados.length,
    cheio: selecionados.length >= TAMANHO_TIME,
    podeSalvar: selecionados.length === TAMANHO_TIME && alterado && !salvando,
    alterado,
    salvando,
    erro,
    aviso,
    filtros,
    mudarFiltros,
    tipos: tiposDaColecao(pokemons),
    visiveis: filtrarEOrdenar(comPosicaoAtual, filtros),
    alternar,
    mover,
    trocar,
    salvar,
  };
}
