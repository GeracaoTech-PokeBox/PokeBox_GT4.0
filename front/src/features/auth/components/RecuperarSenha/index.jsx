import PropTypes from 'prop-types';
import { LOGIN_MAXIMO, SENHA_MINIMA } from '../../constants/index_constants';
import { useRecuperarSenhaViewModel } from './index_viewmodels';
import './RecuperarSenha.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [DRY] As validações e a máscara do celular eram copiadas aqui e em Cadastro; agora existem uma
 *   vez só, no ViewModel.
 */

// Etapa 1: confere login + celular. Etapa 2: define a nova senha daquele usuário.
function RecuperarSenha({ onVerificar, onRedefinir, onVoltar }) {
  const {
    etapa, login, setLogin, celular, mudarCelular, senha, setSenha, confirmarSenha, setConfirmarSenha,
    mostrarSenha, alternarSenha, verificando, erro, verificar, redefinir, trocarUsuario,
  } = useRecuperarSenhaViewModel(onVerificar, onRedefinir);

  const handleVerificar = (e) => {
    e.preventDefault();
    verificar();
  };

  const handleRedefinir = (e) => {
    e.preventDefault();
    redefinir();
  };

  return (
    <main className="recuperar-page">
      <div className="recuperar-pokedex-corpo">
        <div className="recuperar-pokedex-topo" aria-hidden="true">
          <span className="recuperar-pokedex-lente" />
          <div className="recuperar-pokedex-luzes">
            <span className="recuperar-pokedex-luz recuperar-pokedex-luz--vermelha" />
            <span className="recuperar-pokedex-luz recuperar-pokedex-luz--amarela" />
            <span className="recuperar-pokedex-luz recuperar-pokedex-luz--verde" />
          </div>
          <svg
            className="recuperar-pokedex-linha-degrau"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
          >
            <polyline points="0,22 200,22 272,4 400,4" />
            <polyline className="fina" points="0,32 204,32 276,14 400,14" />
          </svg>
        </div>

        <div className="recuperar-pokedex-tela-borda">
          <div className="recuperar-pokedex-tela">
            <img className="recuperar-gengar" src="/gengar.gif" alt="Gengar" />

            <h1 className="recuperar-title">PokeBox</h1>
            <p className="recuperar-subtitle">
              {etapa === 'verificar'
                ? 'Esqueceu a senha? Confirme quem você é, treinador.'
                : `Tudo certo, ${login.trim()}! Escolha sua nova senha.`}
            </p>

            <hr className="recuperar-pokedex-pontilhado" />

            {etapa === 'verificar' ? (
              <form className="recuperar-form" onSubmit={handleVerificar} noValidate>
                <label className="recuperar-field" htmlFor="recuperar-treinador">
                  <span>Treinador</span>
                  <input
                    id="recuperar-treinador"
                    type="text"
                    name="login"
                    maxLength={LOGIN_MAXIMO}
                    placeholder="Seu usuário"
                    autoComplete="username"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </label>

                <label className="recuperar-field" htmlFor="recuperar-celular">
                  <span>Celular</span>
                  <input
                    id="recuperar-celular"
                    type="tel"
                    name="celular"
                    placeholder="(00) 00000-0000"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    value={celular}
                    onChange={(e) => mudarCelular(e.target.value)}
                  />
                </label>

                {erro && (
                  <p className="recuperar-error" role="alert">
                    {erro}
                  </p>
                )}

                <button type="submit" className="recuperar-submit" disabled={verificando}>
                  {verificando ? 'Verificando...' : 'Verificar'}
                </button>
              </form>
            ) : (
              <form className="recuperar-form" onSubmit={handleRedefinir} noValidate>
                <label className="recuperar-field" htmlFor="recuperar-senha">
                  <span>Nova senha</span>
                  <div className="recuperar-password">
                    <input
                      id="recuperar-senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      name="senha"
                      placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                    <button
                      type="button"
                      className="recuperar-toggle"
                      onClick={alternarSenha}
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </label>

                <label className="recuperar-field" htmlFor="recuperar-confirmar-senha">
                  <span>Confirmar nova senha</span>
                  <input
                    id="recuperar-confirmar-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    name="confirmarSenha"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </label>

                {erro && (
                  <p className="recuperar-error" role="alert">
                    {erro}
                  </p>
                )}

                <button type="submit" className="recuperar-submit" disabled={verificando}>
                  {verificando ? 'Salvando...' : 'Redefinir senha'}
                </button>

                <button type="button" className="recuperar-link" onClick={trocarUsuario}>
                  Não é você? Trocar usuário.
                </button>
              </form>
            )}

            <hr className="recuperar-pokedex-pontilhado" />

            <div className="recuperar-register">
              <p>Lembrou a senha?</p>
              <button
                type="button"
                className="recuperar-register-button"
                onClick={() => onVoltar()}
              >
                Voltar para o login
              </button>
            </div>

            <span className="recuperar-pokedex-seta" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}

RecuperarSenha.propTypes = {
  onVerificar: PropTypes.func.isRequired,
  onRedefinir: PropTypes.func.isRequired,
  onVoltar: PropTypes.func.isRequired,
};

export default RecuperarSenha;
