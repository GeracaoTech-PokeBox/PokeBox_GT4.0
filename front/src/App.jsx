import Login from './pages/Login.jsx'

function App() {
  function handleLogin(credenciais) {
    // TODO: integrar com o endpoint de autenticação do back
    console.log('Login:', credenciais.usuario)
  }

  function handleCadastro() {
    // TODO: navegar para a tela de cadastro
    console.log('Cadastro solicitado')
  }

  return <Login onLogin={handleLogin} onCadastro={handleCadastro} />
}

export default App
