import { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Layout, menuLiberado, telaLiberada, useCaminho,
} from '@/shared';
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
import { TutorialGeral, TutorialProvider, useTutorial } from '@/features/tutorial';

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
// Quem ainda não tem Pokémon cai direto na escolha do inicial; com o menu ainda bloqueado, na Loja
const telaInicial = (pokemons) => {
  if (pokemons.length === 0) return 'meusPokemons';
  return menuLiberado(pokemons) ? 'batalhas' : 'loja';
};

// [SOLID-O] O caminho (URL) de cada tela. A tela 'batalha' fica em /batalhas/<id>.
const ROTAS = {
  login: '/login',
  cadastro: '/cadastro',
  recuperarSenha: '/recuperar-senha',
  pokemons: '/pokedex',
  meusPokemons: '/meus-pokemons',
  loja: '/loja',
  time: '/time',
  historia: '/historia',
  vitrine: '/vitrine',
  trocas: '/trocas',
  batalhas: '/batalhas',
  sobre: '/sobre',
};
const TELAS_SEM_LOGIN = ['login', 'cadastro', 'recuperarSenha'];

// '/batalhas/12' -> { tela: 'batalha', batalhaId: 12 }; caminho desconhecido -> tela null
function lerCaminho(caminho) {
  const batalha = caminho.match(/^\/batalhas\/(\d+)\/?$/);
  if (batalha) return { tela: 'batalha', batalhaId: Number(batalha[1]) };
  const semBarraFinal = caminho.length > 1 ? caminho.replace(/\/$/, '') : caminho;
  const tela = Object.keys(ROTAS).find((t) => ROTAS[t] === semBarraFinal) ?? null;
  return { tela, batalhaId: null };
}

/* Tela bloqueada aberta pela URL (digitada, recarregada ou pelo voltar do navegador): vai para a
 * Loja. O tutorial de primeiro acesso pode mostrar as telas bloqueadas, então ele passa direto.
 */
function TelaPermitida({
  bloqueada, irPara, destino, children,
}) {
  const { aberto } = useTutorial();
  const redirecionar = bloqueada && !aberto;
  useEffect(() => {
    if (redirecionar) irPara(destino, { substituir: true });
  }, [redirecionar, irPara, destino]);
  return redirecionar ? null : children;
}

TelaPermitida.propTypes = {
  bloqueada: PropTypes.bool.isRequired,
  irPara: PropTypes.func.isRequired,
  destino: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Só decide qual tela mostrar. Usuário e ações de conta ficam no SessaoProvider.
function App() {
  const {
    usuario, conferindoSessao, restaurarSessao, entrar, cadastrar, sair, verificarUsuario, redefinirSenha, atualizarUsuario,
  } = useSessao();
  // A tela atual vem da URL: recarregar a página mantém a pessoa onde ela estava
  const [caminho, irPara] = useCaminho();
  const { tela, batalhaId } = lerCaminho(caminho);
  const setTela = (destino) => irPara(ROTAS[destino]);

  // Login salvo de uma visita anterior
  useEffect(() => {
    restaurarSessao();
  }, [restaurarSessao]);

  // Logado numa tela de login ou num caminho desconhecido (ex.: '/'): vai para a tela inicial.
  // Numa tela válida (ex.: recarregou em /loja, ou abriu /loja e precisou logar), fica nela.
  const precisaRedirecionar = usuario && (tela === null || TELAS_SEM_LOGIN.includes(tela));
  useEffect(() => {
    if (precisaRedirecionar) irPara(ROTAS[telaInicial(usuario.pokemons)], { substituir: true });
  }, [precisaRedirecionar, usuario, irPara]);

  const handleLogin = async ({ login, senha }) => {
    await entrar(login, senha);
  };

  const handleCadastrar = async (dados) => {
    await cadastrar(dados);
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
    irPara(`${ROTAS.batalhas}/${id}`);
  };

  if (conferindoSessao || precisaRedirecionar) return null;

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
  const telaMenu = tela === 'batalha' ? 'batalhas' : tela;
  // Sem nenhum Pokémon, Meus Pokémon fica aberta: é onde se escolhe o inicial
  const escolhendoInicial = tela === 'meusPokemons' && usuario.pokemons.length === 0;
  const bloqueada = !escolhendoInicial && !telaLiberada(telaMenu, usuario.pokemons);

  return (
    <Layout
      usuario={usuario}
      telaAtual={telaMenu}
      onNavegar={handleNavegar}
      onSair={handleSair}
    >
      {/* O tutorial de primeiro acesso troca de tela pelo mesmo handleNavegar do menu */}
      <TutorialProvider onNavegar={handleNavegar}>
        <TelaPermitida bloqueada={bloqueada} irPara={irPara} destino={ROTAS.loja}>
          {renderTela()}
        </TelaPermitida>
        <TutorialGeral />
      </TutorialProvider>
    </Layout>
  );
}

export default App;
