import { useCallback, useEffect, useState } from 'react';

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

/** Caminho atual da URL e a função que troca de caminho (sem recarregar a página) */
export function useCaminho() {
  const [caminho, setCaminho] = useState(() => window.location.pathname);

  // Voltar/avançar do navegador
  useEffect(() => {
    const aoMudarHistorico = () => setCaminho(window.location.pathname);
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

  return [caminho, irPara];
}
