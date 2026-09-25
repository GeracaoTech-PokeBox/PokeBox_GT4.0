import { useState } from 'react'
import './Login.css'

function Login({ onLogin, onCadastro }) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    if (!usuario.trim() || !senha) {
      setErro('Preencha usuário e senha para continuar.')
      return
    }

    setErro('')
    onLogin?.({ usuario: usuario.trim(), senha })
  }

  return (
    <main className="login-page">
      <div className="pokedex">
        <div className="pokedex-header" aria-hidden="true">
          <span className="pokedex-lens" />
          <div className="pokedex-leds">
            <span className="pokedex-led pokedex-led--red" />
            <span className="pokedex-led pokedex-led--yellow" />
            <span className="pokedex-led pokedex-led--green" />
          </div>
          <svg
            className="pokedex-header-line"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
          >
            <polyline points="0,22 200,22 272,4 400,4" />
            <polyline className="thin" points="0,32 204,32 276,14 400,14" />
          </svg>
        </div>

        <div className="pokedex-screen-frame">
          <div className="pokedex-screen">
            <div className="login-pokeball" aria-hidden="true">
              <span className="login-pokeball-button" />
            </div>

            <h1 className="login-title">PokeBox</h1>
            <p className="login-subtitle">Entre para acessar sua Pokédex</p>

            <hr className="pokedex-dots" />

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label className="login-field">
                <span>Treinador</span>
                <input
                  type="text"
                  name="usuario"
                  placeholder="Seu usuário"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                />
              </label>

              <label className="login-field">
                <span>Senha</span>
                <div className="login-password">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    name="senha"
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>

              {erro && (
                <p className="login-error" role="alert">
                  {erro}
                </p>
              )}

              <button type="submit" className="login-submit">
                Eu escolho você!
              </button>
            </form>

            <hr className="pokedex-dots" />

            <div className="login-register">
              <p>Ainda não é um treinador?</p>
              <button
                type="button"
                className="login-register-button"
                onClick={() => onCadastro?.()}
              >
                Cadastre-se
              </button>
            </div>

            <span className="pokedex-arrow" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default Login
