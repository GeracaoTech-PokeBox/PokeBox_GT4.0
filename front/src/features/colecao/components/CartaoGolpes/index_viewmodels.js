import { useState } from 'react';
import { formatarNome } from '@/shared';

/* [MVVM] ViewModel do CartaoGolpes. Era o useCartaoGolpes, exportado junto com o
 * useCantinhoCuidadoViewModel; agora fica na pasta do componente que o usa.
 * [KISS] handleRoletar(acao = onRoletar) usava um parâmetro padrão para servir aos dois botões;
 *   agora são duas funções com nome, roletar() e desbloquear().
 */

/** Golpes especiais: roleta (e desbloqueio antecipado), que gastam Pokécoins */
export function useCartaoGolpes(pokemon, nome, onRoletar, onDesbloquear) {
  const [girando, setGirando] = useState(false);
  // 'roleta' ou 'desbloqueio' esperando confirmação (os dois gastam Pokécoins)
  const [confirmar, setConfirmar] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);

  const girar = async (acao) => {
    setGirando(true);
    setErro(null);
    setMensagem(null);
    setConfirmar(null);
    try {
      const { pokemon: atualizado } = await acao(pokemon.id);
      const nomes = atualizado.golpes.map((g) => formatarNome(g.nome)).join(' e ');
      setMensagem(`${nome} aprendeu ${nomes}!`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGirando(false);
    }
  };

  return {
    girando,
    confirmar,
    pedirConfirmacao: setConfirmar,
    cancelarConfirmacao: () => setConfirmar(null),
    mensagem,
    erro,
    roletar: () => girar(onRoletar),
    desbloquear: () => girar(onDesbloquear),
  };
}
