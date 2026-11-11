import { createContext, useContext } from 'react';

/* Contexto do tutorial de primeiro acesso. Como o da sessão, o contexto e o Provider ficam em
 * arquivos separados (a regra react-refresh do lint não aceita componente e hook no mesmo arquivo).
 */

// Passo aberto e as ações do tutorial, preenchido pelo TutorialProvider
export const TutorialContext = createContext(null);

/** Lê o tutorial de primeiro acesso em qualquer tela (ex.: Meus Pokémon espera ele fechar) */
export function useTutorial() {
  const tutorial = useContext(TutorialContext);
  if (!tutorial) throw new Error('useTutorial precisa estar dentro de <TutorialProvider>');
  return tutorial;
}
