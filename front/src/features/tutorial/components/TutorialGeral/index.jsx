import { Tutorial } from '@/shared';
import { useTutorial } from '../../context/index_context';

/* [MVVM] View: só desenha o card do passo atual. O passo e as ações vêm do TutorialProvider.
 * key={passo}: o card remonta a cada passo, para a seta medir o novo alvo do zero.
 */
function TutorialGeral() {
  const tutorial = useTutorial();
  if (!tutorial.mostrarCard) return null;

  return (
    <Tutorial
      key={tutorial.passo}
      passos={tutorial.passos}
      passo={tutorial.passo}
      onProximo={tutorial.proximo}
      onPular={tutorial.pular}
    />
  );
}

export default TutorialGeral;
