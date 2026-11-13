import { useCallback, useEffect, useState } from 'react';
import { tempoRestante } from '@/shared';
import { descreverEventos, reservasDoLado } from '../../models/index_models';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';

/* [MVVM] Novo. ViewModel da batalha PvP (./index.jsx). Veio da tela: carregar a batalha,
 * conferir a cada 2s enquanto ela está em andamento e enviar as jogadas.
 * [SOLID-S] A View não sabe mais montar uma jogada ({ tipo: 'golpe', indice }): chama atacar(),
 *   usarGolpe(), trocar() e desistir().
 * [KISS] Lados, reservas e histórico em frases já saem prontos daqui; a View não refaz a conta
 *   "meuIndice = souDesafiante ? 0 : 1".
 * [SOLID-D] onAtualizarUsuario deixou de vir por props: o saldo é atualizado com useSessao().
 */

// Durante a batalha confere a cada 2s se o oponente jogou (ou se algum prazo de 1 min venceu)
const ATUALIZAR_MS = 2 * 1000;
// O contador do prazo anda de segundo em segundo
const RELOGIO_MS = 1000;

/** Uma batalha PvP: carrega, atualiza sozinha enquanto é a vez do oponente e envia as jogadas */
export function useBatalhaViewModel(batalhaId) {
  const { atualizarUsuario } = useSessao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [confirmarDesistencia, setConfirmarDesistencia] = useState(false);
  const [agora, setAgora] = useState(Date.now);

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
  const emAndamento = batalha?.status === 'em_andamento';

  // Também na sua vez: se o seu minuto acabar, a vez passa e a tela precisa mostrar isso
  useEffect(() => {
    if (!emAndamento) return undefined;
    const timer = setInterval(carregar, ATUALIZAR_MS);
    const relogio = setInterval(() => setAgora(Date.now()), RELOGIO_MS);
    return () => {
      clearInterval(timer);
      clearInterval(relogio);
    };
  }, [emAndamento, carregar]);

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
    // Tempo que falta no prazo da jogada atual ("38s"), atualizado a cada segundo
    prazoRestante: emAndamento ? tempoRestante(batalha.prazoEm, agora) : null,
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
