import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import { SessaoContext } from './index_context';
import { PRESENCA_MS } from '../constants/index_constants';
import * as api from '../services/index_services';

/* [MVVM] Novo. ViewModel global da sessão, que veio do App.jsx.
 * [SOLID-S] O App fazia sessão + navegação + ações de outras telas. A parte de sessão (usuário,
 *   restaurar o login salvo, entrar, cadastrar, sair, recarregar) mora aqui agora.
 * [SOLID-I] Fim do prop drilling: `usuario` e `onAtualizarUsuario` desciam por props até 4 níveis
 *   (App → Trocas → Mercado → AnunciosDaEspecie). Agora cada componente lê com useSessao().
 * [KISS] restaurarSessao, entrar e cadastrar devolvem os Pokémon e o App escolhe a primeira tela:
 *   o Provider não precisa saber nada de navegação.
 */

// Guarda o treinador logado e as ações de conta. As telas leem tudo com useSessao().
function SessaoProvider({ children }) {
  // { id, login, pokecoins, pokemons } ou null se não está logado
  const [usuario, setUsuario] = useState(null);
  // Enquanto confere se o token salvo ainda vale, não mostra o login para não "piscar"
  const [conferindoSessao, setConferindoSessao] = useState(api.temSessao);

  // Busca saldo e coleção de novo (depois de comprar, evoluir, batalhar...). Devolve os Pokémon.
  const recarregarUsuario = useCallback(async () => {
    try {
      const { usuario: dados, pokemons } = await api.buscarEu();
      setUsuario({ ...dados, pokemons });
      return pokemons;
    } catch (erro) {
      // Sessão expirou ou a senha foi trocada em outro lugar: sem usuário, o App volta para o login
      if (erro.status === 401) setUsuario(null);
      throw erro;
    }
  }, []);

  // Recarrega sem deixar o erro escapar (usado em atualizações de fundo)
  const atualizarUsuario = useCallback(() => {
    recarregarUsuario().catch(() => {});
  }, [recarregarUsuario]);

  // [DRY] Substitui os 8 blocos "await api.x(); await recarregarUsuario();" que o App repetia.
  // Faz uma ação no back que mexe no saldo ou na coleção e já atualiza o usuário.
  // Devolve o resultado da ação (ex.: o Pokémon evoluído).
  const executarEAtualizar = useCallback(async (acao) => {
    const resultado = await acao();
    await recarregarUsuario();
    return resultado;
  }, [recarregarUsuario]);

  // Login salvo de uma visita anterior. Devolve os Pokémon, ou null se não havia sessão válida.
  // Se o token não vale mais, o api.js o apaga e o usuário cai no login.
  const restaurarSessao = useCallback(async () => {
    if (!api.temSessao()) return null;
    try {
      const { usuario: dados, pokemons } = await api.buscarEu();
      setUsuario({ ...dados, pokemons });
      return pokemons;
    } catch {
      return null;
    } finally {
      setConferindoSessao(false);
    }
  }, []);

  // entrar e cadastrar devolvem os Pokémon, para o App escolher a primeira tela
  const entrar = useCallback(async (login, senha) => {
    await api.entrar(login, senha);
    return recarregarUsuario();
  }, [recarregarUsuario]);

  const cadastrar = useCallback(async (dados) => {
    await api.cadastrar(dados);
    return recarregarUsuario();
  }, [recarregarUsuario]);

  const sair = useCallback(async () => {
    await api.sair().catch(() => {});
    setUsuario(null);
  }, []);

  // Status online: enquanto alguém está logado, manda um sinal de vida para o back de tempos em tempos
  const usuarioId = usuario?.id;
  useEffect(() => {
    if (!usuarioId) return undefined;
    const timer = setInterval(() => api.marcarPresenca().catch(() => {}), PRESENCA_MS);
    return () => clearInterval(timer);
  }, [usuarioId]);

  const sessao = useMemo(() => ({
    usuario,
    conferindoSessao,
    restaurarSessao,
    entrar,
    cadastrar,
    sair,
    verificarUsuario: api.verificarUsuario,
    redefinirSenha: api.redefinirSenha,
    recarregarUsuario,
    atualizarUsuario,
    executarEAtualizar,
  }), [usuario, conferindoSessao, restaurarSessao, entrar, cadastrar, sair, recarregarUsuario, atualizarUsuario, executarEAtualizar]);

  return <SessaoContext.Provider value={sessao}>{children}</SessaoContext.Provider>;
}

SessaoProvider.propTypes = { children: PropTypes.node.isRequired };

export default SessaoProvider;
