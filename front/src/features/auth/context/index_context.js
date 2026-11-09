import { createContext, useContext } from 'react';

/* [MVVM][SOLID-D] Novo. Contexto da sessão: as telas dependem desta abstração (useSessao) em vez
 * de receber `usuario` e callbacks do App por props.
 * [SOLID-S] O contexto e o Provider ficam em pastas separadas: este arquivo só cria o contexto e o
 * hook; o SessaoProvider guarda o estado. (O lint do projeto, regra react-refresh, também não
 * aceita um componente e um hook exportados no mesmo arquivo.)
 */

// Treinador logado e ações de conta, preenchido pelo SessaoProvider
export const SessaoContext = createContext(null);

/** Lê a sessão em qualquer tela, sem precisar receber o usuário por props */
export function useSessao() {
  const sessao = useContext(SessaoContext);
  if (!sessao) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return sessao;
}
