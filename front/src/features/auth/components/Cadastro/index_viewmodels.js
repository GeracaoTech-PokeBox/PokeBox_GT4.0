import { useState } from 'react';
import { formatarCelular, somenteDigitos } from '../../utils/index_utils';
import { validarCelular, validarLogin, validarNovaSenha } from '../../validators/index_validators';

/* [MVVM] ViewModel da tela Cadastro. Era parte de viewmodels/useContaViewModel, que atendia Login,
 * Cadastro e RecuperarSenha.
 * [SOLID-S] Cada tela tem o seu ViewModel; a máscara do celular ficou em ../../utils, as validações
 * em ../../validators e os limites em ../../constants, compartilhados pelas três telas.
 * [SOLID-D] O hook recebe as ações do App: não sabe se elas vão para a API, para um mock ou para um teste.
 */

/** Formulário de cadastro. onCadastrar recebe { login, celular, senha } já validados. */
export function useCadastroViewModel(onCadastrar) {
  const [login, setLogin] = useState('');
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const validar = () => {
    if (!login.trim() || !celular || !senha || !confirmarSenha) {
      return 'Preencha todos os campos para continuar.';
    }
    return validarLogin(login)
      ?? validarCelular(celular)
      ?? validarNovaSenha(senha, confirmarSenha);
  };

  const cadastrar = async () => {
    const mensagem = validar();
    if (mensagem) {
      setErro(mensagem);
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      await onCadastrar({ login: login.trim(), celular: somenteDigitos(celular), senha });
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  };

  return {
    login,
    setLogin,
    celular,
    mudarCelular: (valor) => setCelular(formatarCelular(valor)),
    senha,
    setSenha,
    confirmarSenha,
    setConfirmarSenha,
    mostrarSenha,
    alternarSenha: () => setMostrarSenha((v) => !v),
    erro,
    enviando,
    cadastrar,
  };
}
