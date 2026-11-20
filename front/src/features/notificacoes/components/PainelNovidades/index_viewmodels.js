import { useState } from 'react';
import { useNotificacoes } from '../../context/index_context';

/** Notificações pendentes de uma aba e a ação de ver cada uma (com o aviso da recompensa) */
export function usePainelNovidades(tela) {
  const {
    notificacoes, recompensa, recompensasRestantesHoje, ver,
  } = useNotificacoes();
  const [vendo, setVendo] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  const daTela = notificacoes.filter((n) => n.aba === tela);

  const marcarVista = async (id) => {
    setVendo(id);
    setMensagem(null);
    try {
      const { pokecoins } = await ver(id);
      setMensagem(pokecoins > 0 ? `+${pokecoins} Pokécoins!` : 'Vista! As recompensas de hoje já acabaram.');
    } catch (e) {
      // 404: já tinha sido vista (em outra aba do navegador); ela só some da lista
      setMensagem(e.status === 404 ? null : e.message);
    } finally {
      setVendo(null);
    }
  };

  return {
    daTela,
    recompensa: recompensasRestantesHoje > 0 ? recompensa : 0,
    vendo,
    mensagem,
    marcarVista,
  };
}
