import { useCallback, useEffect, useState } from 'react';
import { descreverEventos, reservasDoLado } from '../../models/index_models';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';

/* [MVVM] Novo. ViewModel da batalha PvP (./index.jsx). Veio da tela: carregar a batalha,
 * conferir a cada 15s enquanto é a vez do oponente e enviar as jogadas.
 * [SOLID-S] A View não sabe mais montar uma jogada ({ tipo: 'golpe', indice }): chama atacar(),
 *   usarGolpe(), trocar() e desistir().
 * [KISS] Lados, reservas e histórico em frases já saem prontos daqui; a View não refaz a conta
 *   "meuIndice = souDesafiante ? 0 : 1".
 * [SOLID-D] onAtualizarUsuario deixou de vir por props: o saldo é atualizado com useSessao().
 */

// Enquanto espera o oponente, confere a cada 15s se ele já jogou
const ATUALIZAR_MS = 15 * 1000;

/** Uma batalha PvP: carrega, atualiza sozinha enquanto é a vez do oponente e envia as jogadas */
export function useBatalhaViewModel(batalhaId) {
  const { atualizarUsuario } = useSessao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [confirmarDesistencia, setConfirmarDesistencia] = useState(false);

  const aplicar = useCallback((resposta) => {
    setDados(resposta);
    // Acabou: saldo e níveis mudaram, então o topo (Pokécoins) precisa atualizar
    if (resposta.batalha.status === 'finalizada') atualizarUsuario();
  }, [atualizarUsuario]);

  const carregar = useCallback(
    () => api.buscarBatalha(batalhaId).then(aplicar, (e) => setErro(e.message)),
    [batalhaId, aplicar],
  );

  useEffect(() => {
    let ativo = true;
    api.buscarBatalha(batalhaId).then(
      (resposta) => {
        if (ativo) aplicar(resposta);
      },
      (e) => {
        if (ativo) setErro(e.message);
      },
    );
    return () => {
      ativo = false;
    };
  }, [batalhaId, aplicar]);

  const batalha = dados?.batalha;
  const esperandoOponente = batalha?.status === 'em_andamento' && !batalha.minhaVez;

  useEffect(() => {
    if (!esperandoOponente) return undefined;
    const timer = setInterval(carregar, ATUALIZAR_MS);
    return () => clearInterval(timer);
  }, [esperandoOponente, carregar]);

  const enviarJogada = async (jogada) => {
    setEnviando(true);
    setErro(null);
    try {
      await api.jogar(batalhaId, jogada);
      setTrocando(false);
      setConfirmarDesistencia(false);
      await carregar();
    } catch (e) {
      setErro(e.message);
      await carregar();
    } finally {
      setEnviando(false);
    }
  };

  // Lados do campo, do meu ponto de vista (só existem depois que a batalha começa)
  const estado = batalha?.estado;
  const meuIndice = batalha?.souDesafiante ? 0 : 1;
  const eu = estado?.lados[meuIndice];
  const oponente = estado?.lados[1 - meuIndice];

  return {
    carregado: Boolean(dados),
    erro,
    batalha,
    comecou: Boolean(estado),
    eu,
    oponente,
    recompensas: batalha?.minhasRecompensas,
    // Pokémon que ainda podem entrar no lugar do ativo.
    // [DRY] Retirado daqui: o map + filter que monta as reservas era uma cópia do de
    // useBatalhaSelvagem (História). Agora os dois usam reservasDoLado() de ../../models.
    reservas: eu ? reservasDoLado(eu) : [],
    // Jogadas da mais nova para a mais antiga, já em frases
    historico: estado
      ? [...dados.acoes].reverse().map((acao) => ({ ...acao, frases: descreverEventos(acao.eventos, estado) }))
      : [],
    enviando,
    trocando,
    alternarTroca: () => setTrocando((v) => !v),
    confirmarDesistencia,
    setConfirmarDesistencia,
    atacar: () => enviarJogada({ tipo: 'atacar' }),
    usarGolpe: (indice) => enviarJogada({ tipo: 'golpe', indice }),
    trocar: (indice) => enviarJogada({ tipo: 'trocar', indice }),
    desistir: () => enviarJogada({ tipo: 'desistir' }),
  };
}
