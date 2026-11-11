import { useEffect, useState } from 'react';
import { Layout } from '@/shared';
import { Login, Cadastro, RecuperarSenha, useSessao } from '@/features/auth';
import { Pokemons } from '@/features/pokedex';
import { MeusPokemons } from '@/features/colecao';
import { Loja } from '@/features/loja';
import { Time } from '@/features/time';
import { Batalhas, Batalha } from '@/features/batalhas';
import { Vitrine } from '@/features/vitrine';
import { Trocas } from '@/features/trocas';
import { Historia } from '@/features/historia';
import { Sobre } from '@/features/sobre';
import { TutorialGeral, TutorialProvider } from '@/features/tutorial';

/* [SOLID-S] Antes, o App tinha 4 responsabilidades: sessão, navegação, as ações de outras telas
 * (evoluir, comprar, salvar o time...) e montar a interface. Agora só decide qual tela mostrar.
 *   - Sessão e ações de conta foram para o SessaoProvider (features/auth/context).
 *   - As ações de cada tela foram para o ViewModel dela (ex.: evoluir → useMeusPokemonsViewModel).
 * [SOLID-O] Uma ação nova na Loja (ou em qualquer tela) não obriga mais a editar o App.
 * [DRY] O par "await api.algumaCoisa(); await recarregarUsuario();" aparecia 8 vezes aqui;
 *   virou executarEAtualizar() no SessaoProvider.
 * [SOLID-I] As telas não recebem mais `usuario` e `onAtualizarUsuario` por props (prop drilling):
 *   quem precisa lê com useSessao(). Por props só desce navegação (onIrPara, onAbrir, onVoltar).
 * [YAGNI] O App não importa mais models/api e não guarda TAMANHO_TIME (Batalhas calcula o temTime).
 */

// [KISS] Uma função para a regra que antes aparecia duas vezes no App (login e sessão salva).
// Quem ainda não tem Pokémon cai direto na escolha do inicial
const telaInicial = (pokemons) => (pokemons.length === 0 ? 'meusPokemons' : 'batalhas');

// Só decide qual tela mostrar. Usuário e ações de conta ficam no SessaoProvider.
function App() {
  const {
    usuario, conferindoSessao, restaurarSessao, entrar, cadastrar, sair, verificarUsuario, redefinirSenha, atualizarUsuario,
  } = useSessao();
  const [tela, setTela] = useState('login');
  const [batalhaId, setBatalhaId] = useState(null);

  // Login salvo de uma visita anterior
  useEffect(() => {
    restaurarSessao().then((pokemons) => {
      if (pokemons) setTela(telaInicial(pokemons));
    });
  }, [restaurarSessao]);

  const handleLogin = async ({ login, senha }) => {
    setTela(telaInicial(await entrar(login, senha)));
  };

  const handleCadastrar = async (dados) => {
    setTela(telaInicial(await cadastrar(dados)));
  };

  const handleRedefinirSenha = async (dados) => {
    await redefinirSenha(dados);
    setTela('login');
  };

  const handleSair = async () => {
    await sair();
    setTela('login');
  };

  const handleNavegar = (destino) => {
    setTela(destino);
    atualizarUsuario();
  };

  const handleAbrirBatalha = (id) => {
    setBatalhaId(id);
    setTela('batalha');
  };

  if (conferindoSessao) return null;

  if (!usuario) {
    if (tela === 'cadastro') {
      return <Cadastro onCadastrar={handleCadastrar} onVoltar={() => setTela('login')} />;
    }
    if (tela === 'recuperarSenha') {
      return (
        <RecuperarSenha
          onVerificar={verificarUsuario}
          onRedefinir={handleRedefinirSenha}
          onVoltar={() => setTela('login')}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onCadastro={() => setTela('cadastro')}
        onEsqueciSenha={() => setTela('recuperarSenha')}
      />
    );
  }

  // [SOLID-O] Uma tela nova é só mais uma entrada neste mapa (foi assim que "Sobre nós" entrou),
  // sem mexer nas outras telas nem no resto do App.
  const telas = {
    pokemons: () => <Pokemons />,
    meusPokemons: () => <MeusPokemons />,
    vitrine: () => <Vitrine />,
    trocas: () => <Trocas />,
    loja: () => <Loja onIrParaTime={() => handleNavegar('time')} />,
    historia: () => <Historia onIrPara={handleNavegar} />,
    time: () => (
      <Time
        // key: remonta com a seleção salva quando a coleção muda (ex.: depois de salvar)
        key={usuario.pokemons.map((p) => `${p.id}:${p.posicaoTime}`).join()}
        onIrParaLoja={() => handleNavegar('loja')}
      />
    ),
    batalhas: () => <Batalhas onAbrir={handleAbrirBatalha} />,
    batalha: () => <Batalha key={batalhaId} batalhaId={batalhaId} onVoltar={() => handleNavegar('batalhas')} />,
    sobre: () => <Sobre />,
  };
  const renderTela = telas[tela] ?? telas.batalhas;

  return (
    <Layout
      usuario={usuario}
      telaAtual={tela === 'batalha' ? 'batalhas' : tela}
      onNavegar={handleNavegar}
      onSair={handleSair}
    >
      {/* O tutorial de primeiro acesso troca de tela pelo mesmo handleNavegar do menu */}
      <TutorialProvider onNavegar={handleNavegar}>
        {renderTela()}
        <TutorialGeral />
      </TutorialProvider>
    </Layout>
  );
}

export default App;
