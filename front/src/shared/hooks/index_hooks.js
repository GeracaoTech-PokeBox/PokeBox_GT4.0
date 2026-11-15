import {
  useCallback, useEffect, useRef, useState,
} from 'react';

/* [MVVM] Era components/useAcao. Mudou para viewmodels/ porque é um hook de estado
 * (enviando/erro/aviso), ou seja, parte do ViewModel, e não um componente.
 */

/* [DRY] Arquivo novo. Anunciar.executar, Propostas.executar e Mercado (AnunciosDaEspecie.handleComprar)
 * eram a mesma função, com os mesmos três estados:
 *
 *   const [enviando, setEnviando] = useState(false);
 *   const [erro, setErro] = useState(null);
 *   const [aviso, setAviso] = useState(null);
 *
 *   const executar = async (acao) => {
 *     setEnviando(true);
 *     setErro(null);
 *     setAviso(null);
 *     try {
 *       await acao();
 *     } catch (e) {
 *       setErro(e.message);
 *     } finally {
 *       setEnviando(false);
 *       setVersao((v) => v + 1);
 *     }
 *   };
 *
 * Só o que acontece no `finally` mudava (recarregar a lista, avisar a tela de cima), então
 * isso virou o parâmetro `aoTerminar`.
 */

/** Estados de uma ação do usuário (enviando / erro / aviso) e a função que a executa */
export function useAcao(aoTerminar = () => {}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  const executar = async (acao) => {
    setEnviando(true);
    setErro(null);
    setAviso(null);
    try {
      await acao();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
      aoTerminar();
    }
  };

  return {
    enviando, erro, setErro, aviso, setAviso, executar,
  };
}

/* [KISS] Rotas sem biblioteca: o caminho da barra de endereço (/loja, /batalhas/12...) é o estado
 * da navegação. Assim, recarregar a página volta para a mesma tela, e os botões voltar/avançar
 * do navegador funcionam.
 */

/**
 * Caminho atual da URL e a função que troca de caminho (sem recarregar a página).
 * @param {(novo: string, continuar: () => void) => boolean} [segurarVoltar] chamado no
 *   voltar/avançar do navegador; se devolver true, a URL volta para a tela atual e a troca só
 *   acontece quando quem chamou rodar continuar() (ex.: depois de confirmar a saída do Time).
 */
export function useCaminho(segurarVoltar) {
  const [caminho, setCaminho] = useState(() => window.location.pathname);
  // Guardados em ref para o listener do popstate não ser refeito a cada render
  const caminhoRef = useRef(caminho);
  const segurarRef = useRef(segurarVoltar);
  useEffect(() => {
    caminhoRef.current = caminho;
    segurarRef.current = segurarVoltar;
  });

  // Voltar/avançar do navegador
  useEffect(() => {
    const aoMudarHistorico = () => {
      const novo = window.location.pathname;
      if (segurarRef.current?.(novo, () => irParaRef.current(novo))) {
        // O navegador já trocou a URL: devolve a da tela atual, que continua aberta
        window.history.pushState(null, '', caminhoRef.current);
        return;
      }
      setCaminho(novo);
    };
    window.addEventListener('popstate', aoMudarHistorico);
    return () => window.removeEventListener('popstate', aoMudarHistorico);
  }, []);

  // substituir: troca a entrada atual do histórico em vez de criar outra (redirecionamentos)
  const irPara = useCallback((novo, { substituir = false } = {}) => {
    if (novo !== window.location.pathname) {
      window.history[substituir ? 'replaceState' : 'pushState'](null, '', novo);
    }
    setCaminho(novo);
  }, []);
  const irParaRef = useRef(irPara);

  return [caminho, irPara];
}
