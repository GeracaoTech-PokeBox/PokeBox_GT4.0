import { createContext, useContext } from 'react';

/* [MVVM][SOLID-D] Contexto das notificações: o menu (contagem por aba) e o painel de cada tela
 * leem daqui com useNotificacoes(). O estado fica no NotificacoesProvider (index_provider.jsx).
 */

export const NotificacoesContext = createContext(null);

/** Notificações pendentes, a contagem por aba e as ações (ver, recarregar) */
export function useNotificacoes() {
  const valor = useContext(NotificacoesContext);
  if (!valor) throw new Error('useNotificacoes precisa estar dentro de <NotificacoesProvider>');
  return valor;
}
