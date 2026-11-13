import { useState } from 'react';
import { descreverEventos, reservasDoLado } from '@/features/batalhas';

/* [MVVM] ViewModel do BatalhaSelvagem. Era o useBatalhaSelvagem, exportado junto com o
 * useHistoriaViewModel; agora fica na pasta do componente que o usa.
 */

/** Uma batalha contra o selvagem: reservas para troca, resultado e histórico em frases */
export function useBatalhaSelvagem(batalha, onJogar) {
  const [trocando, setTrocando] = useState(false);
  const { estado, log, fim } = batalha;
  const [eu, selvagem] = estado.lados;
  const venci = fim?.vencedor === 0;

  let resultado = null;
  if (fim) {
    resultado = venci ? 'Você venceu!' : 'Você perdeu...';
    if (venci && estado.revanche) resultado = 'Você venceu a revanche!';
    if (fim.motivo === 'desistencia') resultado = 'Você fugiu da batalha.';
  }

  const jogar = async (jogada) => {
    setTrocando(false);
    await onJogar(jogada);
  };

  return {
    eu,
    selvagem,
    fim,
    venci,
    revanche: Boolean(estado.revanche),
    resultado,
    recompensa: batalha.recompensa,
    // [DRY] Retirado daqui: o map + filter que monta as reservas era uma cópia do de
    // useBatalhaViewModel (batalha PvP). Agora os dois usam reservasDoLado() de @/features/batalhas.
    reservas: reservasDoLado(eu),
    // Turnos do mais novo para o mais antigo, já em frases
    historico: log
      .map((turno, i) => ({
        numero: i + 1,
        meu: turno.lado === 0,
        frases: descreverEventos(turno.eventos, estado),
      }))
      .reverse(),
    trocando,
    alternarTroca: () => setTrocando((v) => !v),
    atacar: () => jogar({ tipo: 'atacar' }),
    usarGolpe: (indice) => jogar({ tipo: 'golpe', indice }),
    trocar: (indice) => jogar({ tipo: 'trocar', indice }),
    fugir: () => jogar({ tipo: 'desistir' }),
  };
}
