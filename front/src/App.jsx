import { useState } from 'react'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import RecuperarSenha from './pages/RecuperarSenha.jsx'

function App() {
  const [tela, setTela] = useState('login')

  function handleLogin(credenciais) {
    // TODO: integrar com o endpoint de autenticação do back
    console.log('Login:', credenciais.login)
  }

  function handleCadastrar(dados) {
    // TODO: integrar com o endpoint de cadastro do back
    console.log('Cadastro:', dados.login, dados.celular)
  }

  async function handleVerificarUsuario(dados) {
    // TODO: perguntar ao back se existe um usuário com esse login e celular.
    // Enquanto o endpoint não existe, qualquer combinação é aceita.
    console.log('Verificar usuário:', dados.login, dados.celular)
    return true
  }

  function handleRedefinirSenha(dados) {
    // TODO: integrar com o endpoint de redefinição de senha do back
    console.log('Redefinir senha:', dados.login)
    setTela('login')
  }

  if (tela === 'cadastro') {
    return <Cadastro onCadastrar={handleCadastrar} onVoltar={() => setTela('login')} />
  }

  if (tela === 'recuperarSenha') {
    return (
      <RecuperarSenha
        onVerificar={handleVerificarUsuario}
        onRedefinir={handleRedefinirSenha}
        onVoltar={() => setTela('login')}
      />
    )
  }

  return (
    <Login
      onLogin={handleLogin}
      onCadastro={() => setTela('cadastro')}
      onEsqueciSenha={() => setTela('recuperarSenha')}
    />
  )
}

export default App
