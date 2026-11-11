import { useState } from 'react';
import { useSessao } from '@/features/auth';
import { useTutorial } from '../context/index_context';
import { PASSOS_CUIDADOS } from '../constants/index_constants';
import { cuidadosVistos, marcarCuidadosVistos } from '../services/index_services';

/**
 * Tutorial de cuidados da tela Meus Pokémon: abre sozinho na primeira visita com coleção (depois que
 * o tutorial de primeiro acesso fecha) ou pelo botão "Como cuidar dos Pokémon" (rever).
 */
export function useTutorialCuidados() {
  const { usuario } = useSessao();
  const { aberto: tutorialGeralAberto } = useTutorial();
  const [passo, setPasso] = useState(0);
  const [visto, setVisto] = useState(() => cuidadosVistos(usuario.id));
  // Aberto de novo pelo botão, mesmo já tendo visto
  const [revendo, setRevendo] = useState(false);

  const fechar = () => {
    marcarCuidadosVistos(usuario.id);
    setVisto(true);
    setRevendo(false);
    setPasso(0);
  };

  return {
    aberto: !tutorialGeralAberto && (revendo || !visto),
    passos: PASSOS_CUIDADOS,
    passo,
    proximo: () => (passo === PASSOS_CUIDADOS.length - 1 ? fechar() : setPasso(passo + 1)),
    pular: fechar,
    rever: () => {
      setPasso(0);
      setRevendo(true);
    },
  };
}
