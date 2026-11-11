import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import { useSessao } from '@/features/auth';
import { TutorialContext } from './index_context';
import { PASSOS_TUTORIAL } from '../constants/index_constants';
import { passoInicial } from '../models/index_models';
import { lerPasso, salvarPasso } from '../services/index_services';

/* [MVVM] ViewModel do tutorial de primeiro acesso, compartilhado por contexto: o App mostra o card
 * (TutorialGeral) e Meus Pokémon espera ele fechar para abrir o tutorial de cuidados.
 * [SOLID-S] A navegação continua no App: o Provider só avisa, por onNavegar, qual tela o passo abre.
 * Fica dentro do Layout, então só existe com alguém logado (e recomeça a cada login).
 */
function TutorialProvider({ onNavegar, children }) {
  const { usuario } = useSessao();
  const [estado, setEstado] = useState(() => ({
    passo: passoInicial(lerPasso(usuario.id), usuario.pokemons),
    // No passo "Escolha seu inicial" o card some até o treinador escolher o parceiro
    esperandoInicial: false,
  }));

  // Escolheu o inicial enquanto o tutorial esperava: segue para o passo seguinte
  const temPokemon = usuario.pokemons.length > 0;
  const passo = estado.esperandoInicial && temPokemon ? estado.passo + 1 : estado.passo;
  const esperando = estado.esperandoInicial && !temPokemon;

  // onNavegar muda a cada render do App: guarda o mais novo sem refazer o efeito de navegação
  const navegarRef = useRef(onNavegar);
  useEffect(() => {
    navegarRef.current = onNavegar;
  });

  // Cada passo abre a sua tela
  useEffect(() => {
    if (passo !== null) navegarRef.current(PASSOS_TUTORIAL[passo].tela);
  }, [passo]);

  const tutorial = useMemo(() => {
    const irPara = (proximo) => {
      const fim = proximo >= PASSOS_TUTORIAL.length;
      salvarPasso(usuario.id, fim ? null : proximo);
      setEstado({ passo: fim ? null : proximo, esperandoInicial: false });
    };
    return {
      aberto: passo !== null,
      // O card some enquanto espera o inicial ser escolhido
      mostrarCard: passo !== null && !esperando,
      passos: PASSOS_TUTORIAL,
      passo,
      proximo: () => {
        if (PASSOS_TUTORIAL[passo].esperaInicial && !temPokemon) {
          setEstado({ passo, esperandoInicial: true });
          return;
        }
        irPara(passo + 1);
      },
      pular: () => irPara(PASSOS_TUTORIAL.length),
    };
  }, [passo, esperando, temPokemon, usuario.id]);

  return <TutorialContext.Provider value={tutorial}>{children}</TutorialContext.Provider>;
}

TutorialProvider.propTypes = {
  onNavegar: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default TutorialProvider;
