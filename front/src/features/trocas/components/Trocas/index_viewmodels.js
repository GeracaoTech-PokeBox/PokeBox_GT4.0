import { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/index_services';

/* [MVVM] Novo. ViewModel da tela Trocas: aba aberta e contador de propostas pendentes.
 * [SOLID-I] Trocas recebia `usuario` e `onAtualizarUsuario` só para repassar a Mercado, Anunciar e
 *   Propostas (prop drilling). Agora não recebe nada: cada um lê o que precisa de useSessao().
 */

/** Aba aberta e o número de propostas recebidas esperando resposta */
export function useTrocasViewModel() {
  const [aba, setAba] = useState('mercado');
  const [pendentes, setPendentes] = useState(0);

  const contarPendentes = useCallback(() => {
    api.listarPropostas().then(
      ({ recebidas }) => setPendentes(recebidas.filter((p) => p.status === 'pendente').length),
      () => {},
    );
  }, []);

  useEffect(() => {
    contarPendentes();
  }, [contarPendentes]);

  return {
    aba, setAba, pendentes, contarPendentes,
  };
}
