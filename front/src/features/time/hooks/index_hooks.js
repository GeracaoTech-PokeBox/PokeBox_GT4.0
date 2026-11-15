import { useRef, useState } from 'react';

/* Arrastar as vagas do time para mudar a ordem. Pointer Events em vez do drag and drop do HTML:
 * funcionam igual com mouse e com toque, e o card segue o dedo/cursor.
 * [MVVM] É só estado visual (qual card está sendo arrastado e para onde): a troca de lugar de
 * verdade é a função onSoltar, que vem do ViewModel.
 */

// Quanto o ponteiro precisa andar para virar arrasto (menos que isso é um clique comum)
const DISTANCIA_MINIMA = 6;

// Vaga (data-vaga) debaixo do ponteiro, sem contar a que está sendo arrastada
function vagaNoPonto(x, y, arrastada) {
  const vaga = document.elementsFromPoint(x, y)
    .map((el) => el.closest('[data-vaga]'))
    .find((el) => el && el !== arrastada);
  return vaga ? Number(vaga.dataset.vaga) : null;
}

/**
 * @param {(origem: number, destino: number) => void} onSoltar troca as vagas de lugar
 * @returns {{ arrasto: object | null, propsDaVaga: (indice: number, podeArrastar: boolean) => object }}
 */
export function useArrastarVagas(onSoltar) {
  // { origem, sobre, dx, dy } enquanto arrasta; null parado
  const [arrasto, setArrasto] = useState(null);
  // Onde o ponteiro desceu; só vira arrasto depois de DISTANCIA_MINIMA
  const inicio = useRef(null);

  const terminar = () => {
    inicio.current = null;
    setArrasto(null);
  };

  const propsDaVaga = (indice, podeArrastar) => ({
    'data-vaga': indice,
    'data-arrastavel': podeArrastar,
    'data-arrastando': arrasto?.origem === indice,
    'data-alvo': arrasto !== null && arrasto.sobre === indice && arrasto.origem !== indice,
    style: arrasto?.origem === indice ? { transform: `translate(${arrasto.dx}px, ${arrasto.dy}px)` } : undefined,
    onPointerDown: (e) => {
      // Os botões ◀ ✕ ▶ continuam sendo cliques normais
      if (!podeArrastar || e.button !== 0 || e.target.closest('button')) return;
      inicio.current = { x: e.clientX, y: e.clientY, ativo: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const i = inicio.current;
      if (!i) return;
      const dx = e.clientX - i.x;
      const dy = e.clientY - i.y;
      if (!i.ativo && Math.hypot(dx, dy) < DISTANCIA_MINIMA) return;
      i.ativo = true;
      setArrasto({
        origem: indice, sobre: vagaNoPonto(e.clientX, e.clientY, e.currentTarget), dx, dy,
      });
    },
    onPointerUp: () => {
      if (arrasto && arrasto.sobre !== null && arrasto.sobre !== indice) onSoltar(indice, arrasto.sobre);
      terminar();
    },
    onPointerCancel: terminar,
  });

  return { arrasto, propsDaVaga };
}
