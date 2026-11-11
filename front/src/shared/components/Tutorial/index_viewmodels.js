import { useLayoutEffect, useState } from 'react';

/* [MVVM] ViewModel do Tutorial: onde está, na tela, o elemento que o passo explica.
 * A View só posiciona o card e a seta a partir desse retângulo.
 */

// Posição do elemento-alvo na tela, atualizada ao rolar ou redimensionar
export function useRetanguloAlvo(alvo) {
  const [retangulo, setRetangulo] = useState(null);

  useLayoutEffect(() => {
    // O Tutorial remonta a cada passo (key), então sem alvo o retângulo já começa null
    if (!alvo) return undefined;
    const medir = () => {
      const elemento = document.querySelector(`[data-tutorial="${alvo}"]`);
      setRetangulo(elemento ? elemento.getBoundingClientRect() : null);
    };
    // Traz o alvo para a tela se ele estiver fora dela (ex.: um card mais abaixo na coleção)
    const elemento = document.querySelector(`[data-tutorial="${alvo}"]`);
    const inicial = elemento?.getBoundingClientRect();
    if (inicial && (inicial.top < 0 || inicial.bottom > window.innerHeight)) {
      elemento.scrollIntoView({ block: 'center' });
    } else if (inicial && (inicial.left < 0 || inicial.right > window.innerWidth)) {
      // Botão escondido na faixa do menu, que no celular rola de lado
      elemento.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [alvo]);

  return retangulo;
}
