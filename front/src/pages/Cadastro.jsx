import { useState } from 'react'
import './Login.css'
import './Cadastro.css'
import {
  SENHA_MINIMA,
  formatarCelular,
  somenteDigitos,
  validarCelular,
  validarNovaSenha,
} from '../utils/validacao.js'

function Cadastro({ onCadastrar, onVoltar }) {
  const [login, setLogin] = useState('')
  const [celular, setCelular] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState(null)

  function validar() {
    if (!login.trim() || !celular || !senha || !confirmarSenha) {
      return 'Preencha todos os campos para continuar.'
    }
    return validarCelular(celular) ?? validarNovaSenha(senha, confirmarSenha)
  }

  function handleSubmit(e) {
    e.preventDefault()

    const mensagem = validar()
    if (mensagem) {
      setErro(mensagem)
      return
    }

    setErro(null)
    onCadastrar?.({ login: login.trim(), celular: somenteDigitos(celular), senha })
  }

  return (
    <main className="login-page cadastro-page">
      <div className="pokedex-corpo">
        <div className="pokedex-topo" aria-hidden="true">
          <span className="pokedex-lente" />
          <div className="pokedex-luzes">
            <span className="pokedex-luz pokedex-luz--vermelha" />
            <span className="pokedex-luz pokedex-luz--amarela" />
            <span className="pokedex-luz pokedex-luz--verde" />
          </div>
          <svg
            className="pokedex-linha-degrau"
            viewBox="0 0 400 40"
            preserveAspectRatio="none"
          >
            <polyline points="0,22 200,22 272,4 400,4" />
            <polyline className="fina" points="0,32 204,32 276,14 400,14" />
          </svg>
        </div>

        <div className="pokedex-tela-borda">
          <div className="pokedex-tela">
            <div className="cadastro-professor">
              <img src="/professor-oak.gif" alt="Professor Carvalho" />
            </div>

            <h1 className="login-title">PokeBox</h1>
            <p className="login-subtitle">
              Bem-vindo ao mundo Pokémon! Conte-me sobre você, treinador.
            </p>

            <hr className="pokedex-pontilhado" />

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label className="login-field">
                <span>Treinador</span>
                <input
                  type="text"
                  name="login"
                  placeholder="Escolha seu usuário"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </label>

              <label className="login-field">
                <span>Celular</span>
                <input
                  type="tel"
                  name="celular"
                  placeholder="(00) 00000-0000"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  value={celular}
                  onChange={(e) => setCelular(formatarCelular(e.target.value))}
                />
              </label>

              <label className="login-field">
                <span>Senha</span>
                <div className="login-password">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    name="senha"
                    placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
                    autoComplete="new-password"
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

              <label className="login-field">
                <span>Confirmar senha</span>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  name="confirmarSenha"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </label>

              {erro && (
                <p className="login-error" role="alert">
                  {erro}
                </p>
              )}

              <button type="submit" className="login-submit">
                Começar minha jornada!
              </button>
            </form>

            <hr className="pokedex-pontilhado" />

            <div className="login-register">
              <p>Já é um treinador?</p>
              <button
                type="button"
                className="login-register-button"
                onClick={() => onVoltar?.()}
              >
                Entrar
              </button>
            </div>

            <span className="pokedex-seta" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default Cadastro
