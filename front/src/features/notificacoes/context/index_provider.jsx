import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import { useSessao } from '@/features/auth';
import { listarNotificacoes, verNotificacao } from '../services/index_services';
import { NotificacoesContext } from './index_context';

/* [MVVM][SOLID-D] Guarda as notificações do treinador logado. Fica em volta do App (main.jsx),
 * junto do SessaoProvider: o menu mostra a contagem por aba e cada tela mostra as dela.
 */

// De quanto em quanto tempo busca notificações novas (só com a aba do navegador visível)
const INTERVALO_MS = 30 * 1000;

const VAZIO = {
  notificacoes: [], porAba: {}, recompensa: 0, recompensasRestantesHoje: 0,
};

const contarPorAba = (notificacoes) => notificacoes.reduce((porAba, n) => ({
  ...porAba, [n.aba]: (porAba[n.aba] ?? 0) + 1,
}), {});

function NotificacoesProvider({ children }) {
  const { usuario, atualizarUsuario } = useSessao();
  const login = usuario?.login ?? null;
  const logado = login !== null;
  // `dono`: de quem são estas notificações. Saindo da conta (ou trocando de treinador), as antigas
  // deixam de valer na hora, sem esperar a próxima busca.
  const [dados, setDados] = useState({ ...VAZIO, dono: null });

  const recarregar = useCallback(async () => {
    if (!logado) return;
    try {
      setDados({ ...(await listarNotificacoes()), dono: login });
    } catch {
      // Falha de rede: mantém as que já estavam na tela e tenta de novo no próximo ciclo
    }
  }, [logado, login]);

  // Busca ao entrar e de tempos em tempos (a navegação entre telas também chama recarregar)
  useEffect(() => {
    if (!logado) return undefined;
    let ativo = true;
    const buscar = () => listarNotificacoes().then((resposta) => {
      if (ativo) setDados({ ...resposta, dono: login });
    }, () => {});
    buscar();
    const id = setInterval(() => {
      if (!document.hidden) buscar();
    }, INTERVALO_MS);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [logado, login]);

  // Marca como vista e tira da lista; com recompensa, atualiza o saldo no topo
  const ver = useCallback(async (id) => {
    const tirar = (estado, extra = {}) => {
      const notificacoes = estado.notificacoes.filter((n) => n.id !== id);
      return {
        ...estado, ...extra, notificacoes, porAba: contarPorAba(notificacoes),
      };
    };
    try {
      const resultado = await verNotificacao(id);
      setDados((estado) => tirar(estado, { recompensasRestantesHoje: resultado.recompensasRestantesHoje }));
      if (resultado.pokecoins > 0) atualizarUsuario();
      return resultado;
    } catch (erro) {
      // Já vista em outra aba do navegador: só some daqui
      if (erro.status === 404) setDados((estado) => tirar(estado));
      throw erro;
    }
  }, [atualizarUsuario]);

  const valor = useMemo(() => {
    const { dono, ...doTreinador } = dados;
    return { ...(dono === login && logado ? doTreinador : VAZIO), ver, recarregar };
  }, [dados, login, logado, ver, recarregar]);
  return <NotificacoesContext.Provider value={valor}>{children}</NotificacoesContext.Provider>;
}

NotificacoesProvider.propTypes = { children: PropTypes.node.isRequired };

export default NotificacoesProvider;
