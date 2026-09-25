import Login from './pages/Login.jsx'

function App() {
  function handleLogin(credenciais) {
    // TODO: integrar com o endpoint de autenticação do back
    console.log('Login:', credenciais.usuario)
  }

  return <Login onLogin={handleLogin} />
}

export default App
