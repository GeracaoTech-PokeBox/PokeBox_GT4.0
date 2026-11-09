import { useState } from 'react';

/* [MVVM] ViewModel da tela Login. Era parte de viewmodels/useContaViewModel, que atendia Login,
 * Cadastro e RecuperarSenha.
 * [SOLID-S] Cada tela tem o seu ViewModel; a máscara do celular ficou em ../../utils, as validações
 * em ../../validators e os limites em ../../constants, compartilhados pelas três telas.
 * [SOLID-D] O hook recebe as ações do App: não sabe se elas vão para a API, para um mock ou para um teste.
 */

/** Formulário de login. onLogin recebe { login, senha } e faz a entrada. */
export function useLoginViewModel(onLogin) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  const entrar = async () => {
    if (!login.trim() || !senha) {
      setErro('Preencha usuário e senha para continuar.');
      return;
    }

    setErro(null);
    setEntrando(true);
    try {
      await onLogin({ login: login.trim(), senha });
    } catch (falha) {
      setErro(falha.message);
      setEntrando(false);
    }
  };

  return {
    login,
    setLogin,
    senha,
    setSenha,
    mostrarSenha,
    alternarSenha: () => setMostrarSenha((v) => !v),
    erro,
    entrando,
    entrar,
  };
}
