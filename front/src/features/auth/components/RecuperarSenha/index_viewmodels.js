import { useState } from 'react';
import { formatarCelular, somenteDigitos } from '../../utils/index_utils';
import { validarCelular, validarLogin, validarNovaSenha } from '../../validators/index_validators';

/* [MVVM] ViewModel da tela RecuperarSenha. Era parte de viewmodels/useContaViewModel, que atendia Login,
 * Cadastro e RecuperarSenha.
 * [SOLID-S] Cada tela tem o seu ViewModel; a máscara do celular ficou em ../../utils, as validações
 * em ../../validators e os limites em ../../constants, compartilhados pelas três telas.
 * [SOLID-D] O hook recebe as ações do App: não sabe se elas vão para a API, para um mock ou para um teste.
 */

/**
 * Recuperar senha em duas etapas.
 * Etapa 1: confere login + celular (onVerificar). Etapa 2: define a nova senha (onRedefinir).
 */
export function useRecuperarSenhaViewModel(onVerificar, onRedefinir) {
  const [etapa, setEtapa] = useState('verificar');
  const [login, setLogin] = useState('');
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState(null);

  const dadosUsuario = () => ({ login: login.trim(), celular: somenteDigitos(celular) });

  const verificar = async () => {
    if (!login.trim() || !celular) {
      setErro('Preencha usuário e celular para continuar.');
      return;
    }
    const erroDados = validarLogin(login) ?? validarCelular(celular);
    if (erroDados) {
      setErro(erroDados);
      return;
    }

    setErro(null);
    setVerificando(true);
    try {
      const encontrado = await onVerificar(dadosUsuario());
      if (!encontrado) {
        setErro('Não encontramos um treinador com esse usuário e celular.');
        return;
      }
      setEtapa('redefinir');
    } catch {
      setErro('Não foi possível verificar agora. Tente novamente.');
    } finally {
      setVerificando(false);
    }
  };

  const redefinir = async () => {
    if (!senha || !confirmarSenha) {
      setErro('Preencha a nova senha e a confirmação.');
      return;
    }
    const erroSenha = validarNovaSenha(senha, confirmarSenha);
    if (erroSenha) {
      setErro(erroSenha);
      return;
    }

    setErro(null);
    setVerificando(true);
    try {
      await onRedefinir({ ...dadosUsuario(), senha });
    } catch (falha) {
      setErro(falha.message);
      setVerificando(false);
    }
  };

  const trocarUsuario = () => {
    setEtapa('verificar');
    setSenha('');
    setConfirmarSenha('');
    setErro(null);
  };

  return {
    etapa,
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
    verificando,
    erro,
    verificar,
    redefinir,
    trocarUsuario,
  };
}
