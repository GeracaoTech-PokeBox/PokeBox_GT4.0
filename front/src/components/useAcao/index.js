import { useState } from 'react';

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
