import PropTypes from 'prop-types';
import { LOGIN_MAXIMO, SENHA_MINIMA } from '../../constants/index_constants';
import { useCadastroViewModel } from './index_viewmodels';
import './Cadastro.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [DRY] As validações e a máscara do celular eram copiadas aqui e em RecuperarSenha; agora existem
 *   uma vez só, no ViewModel.
 */

function Cadastro({ onCadastrar, onVoltar }) {
  const {
    login, setLogin, celular, mudarCelular, senha, setSenha, confirmarSenha, setConfirmarSenha,
    mostrarSenha, alternarSenha, erro, enviando, cadastrar,
  } = useCadastroViewModel(onCadastrar);

  const handleSubmit = (e) => {
    e.preventDefault();
    cadastrar();
  };

  return (
    <main className="cadastro-page">
      <div className="cadastro-pokedex-corpo">
        <div className="cadastro-pokedex-topo" aria-hidden="true">
          <span className="cadastro-pokedex-lente" />
          <div className="cadastro-pokedex-luzes">
            <span className="cadastro-pokedex-luz cadastro-pokedex-luz--vermelha" />
            <span className="cadastro-pokedex-luz cadastro-pokedex-luz--amarela" />
            <span className="cadastro-pokedex-luz cadastro-pokedex-luz--verde" />
          </div>
          <svg
            className="cadastro-pokedex-linha-degrau"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
          >
            <polyline points="0,22 200,22 272,4 400,4" />
            <polyline className="fina" points="0,32 204,32 276,14 400,14" />
          </svg>
        </div>

        <div className="cadastro-pokedex-tela-borda">
          <div className="cadastro-pokedex-tela">
            <div className="cadastro-professor">
              <img src="/professor-oak.gif" alt="Professor Carvalho" />
            </div>

            <h1 className="cadastro-title">PokeBox</h1>
            <p className="cadastro-subtitle">
              Bem-vindo ao mundo Pokémon! Conte-me sobre você, treinador.
            </p>

            <hr className="cadastro-pokedex-pontilhado" />

            <form className="cadastro-form" onSubmit={handleSubmit} noValidate>
              <label className="cadastro-field" htmlFor="cadastro-treinador">
                <span>Treinador</span>
                <input
                  id="cadastro-treinador"
                  type="text"
                  name="login"
                  maxLength={LOGIN_MAXIMO}
                  placeholder={`Até ${LOGIN_MAXIMO} caracteres`}
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </label>

              <label className="cadastro-field" htmlFor="cadastro-celular">
                <span>Celular</span>
                <input
                  id="cadastro-celular"
                  type="tel"
                  name="celular"
                  placeholder="(00) 00000-0000"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  value={celular}
                  onChange={(e) => mudarCelular(e.target.value)}
                />
              </label>

              <label className="cadastro-field" htmlFor="cadastro-senha">
                <span>Senha</span>
                <div className="cadastro-password">
                  <input
                    id="cadastro-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    name="senha"
                    placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="cadastro-toggle"
                    onClick={alternarSenha}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>

              <label className="cadastro-field" htmlFor="cadastro-confirmar-senha">
                <span>Confirmar senha</span>
                <input
                  id="cadastro-confirmar-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  name="confirmarSenha"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </label>

              {erro && (
                <p className="cadastro-error" role="alert">
                  {erro}
                </p>
              )}

              <button type="submit" className="cadastro-submit" disabled={enviando}>
                {enviando ? 'Cadastrando...' : 'Começar minha jornada!'}
              </button>
            </form>

            <hr className="cadastro-pokedex-pontilhado" />

            <div className="cadastro-register">
              <p>Já é um treinador?</p>
              <button
                type="button"
                className="cadastro-register-button"
                onClick={() => onVoltar()}
              >
                Entrar
              </button>
            </div>

            <span className="cadastro-pokedex-seta" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}

Cadastro.propTypes = {
  onCadastrar: PropTypes.func.isRequired,
  onVoltar: PropTypes.func.isRequired,
};

export default Cadastro;
