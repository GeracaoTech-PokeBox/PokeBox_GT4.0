/* Conteúdo da aba "Sobre nós".
 * Os recortes de código vêm do próprio código-fonte (import '...?raw' do Vite): se o arquivo mudar,
 * o recorte acompanha. Por isso estes imports apontam para arquivos de outras features por caminho
 * completo: é só o texto do arquivo, não a API dele.
 */
import appFonte from '@/App.jsx?raw';
import clienteHttpFonte from '@/core/services/index_services.js?raw';
import loginViewModelFonte from '@/features/auth/components/Login/index_viewmodels.js?raw';
import sessaoContextoFonte from '@/features/auth/context/index_context.js?raw';
import campoBatalhaFonte from '@/features/batalhas/components/CampoBatalha/index.jsx?raw';
import cantinhoViewModelFonte from '@/features/colecao/components/CantinhoCuidado/index_viewmodels.js?raw';
import lojaViewModelFonte from '@/features/loja/components/Loja/index_viewmodels.js?raw';
import lojaPokebolasViewModelFonte from '@/features/loja/components/LojaPokebolas/index_viewmodels.js?raw';
import mercadoFonte from '@/features/trocas/components/Mercado/index.jsx?raw';
import trocasViewModelFonte from '@/features/trocas/components/Trocas/index_viewmodels.js?raw';
import layoutFonte from '@/shared/components/Layout/index.jsx?raw';
import utilsFonte from '@/shared/utils/index_utils.js?raw';

export const ABAS = [
  { valor: 'geracaoTech', nome: 'Geração Tech 4.0' },
  { valor: 'pokeapi', nome: 'PokeAPI' },
  { valor: 'criterios', nome: 'Critérios de avaliação' },
];

// Cada exemplo: arquivo (como aparece no projeto), fonte (texto do arquivo) e onde recortar
export const CRITERIOS = [
  {
    id: 'KISS',
    nome: 'Keep It Simple, Stupid',
    resumo: 'Preferir a solução mais simples que resolve o problema.',
    exemplos: [
      {
        arquivo: 'src/App.jsx',
        fonte: appFonte,
        marcador: '// [KISS] Uma função para a regra',
        depois: 2,
        explicacao: 'A escolha da primeira tela virou uma função de uma linha, usada no login e na sessão salva.',
      },
      {
        arquivo: 'src/features/colecao/components/CantinhoCuidado/index_viewmodels.js',
        fonte: cantinhoViewModelFonte,
        marcador: '// [KISS] "((x % 100)',
        depois: 1,
        explicacao: 'Uma conta que dividia e multiplicava por 100 à toa ficou só com o resto da divisão.',
      },
    ],
  },
  {
    id: 'DRY',
    nome: "Don't Repeat Yourself",
    resumo: 'Cada regra existe em um só lugar.',
    exemplos: [
      {
        arquivo: 'src/shared/utils/index_utils.js',
        fonte: utilsFonte,
        marcador: 'export function carregar(',
        antes: 4,
        depois: 10,
        explicacao: 'O bloco "let ativo = true ..." era copiado em seis telas; agora todas usam carregar().',
      },
      {
        arquivo: 'src/shared/utils/index_utils.js',
        fonte: utilsFonte,
        marcador: '// "1 anúncio"',
        depois: 1,
        explicacao: 'Singular/plural ("1 anúncio", "3 anúncios") era refeito à mão em várias telas.',
      },
    ],
  },
  {
    id: 'YAGNI',
    nome: "You Aren't Gonna Need It",
    resumo: 'Não manter o que ninguém usa.',
    exemplos: [
      {
        arquivo: 'src/features/batalhas/components/CampoBatalha/index.jsx',
        fonte: campoBatalhaFonte,
        marcador: '// [YAGNI] Era exportada',
        depois: 3,
        explicacao: 'BarraHp deixou de ser exportada: só o LadoCampo, no mesmo arquivo, usa.',
      },
      {
        arquivo: 'src/shared/utils/index_utils.js',
        fonte: utilsFonte,
        marcador: '// [YAGNI] Era exportada só para PokemonCard',
        depois: 3,
        explicacao: 'TIPO_DESCONHECIDO virou interna depois que o último arquivo que a importava parou de usar.',
      },
    ],
  },
  {
    id: 'SOLID-S',
    nome: 'Responsabilidade única',
    resumo: 'Cada módulo tem um só motivo para mudar.',
    exemplos: [
      {
        arquivo: 'src/features/auth/components/Login/index_viewmodels.js',
        fonte: loginViewModelFonte,
        marcador: '/* [MVVM] ViewModel da tela Login',
        depois: 10,
        explicacao: 'O ViewModel que atendia Login, Cadastro e RecuperarSenha foi dividido: um por tela.',
      },
      {
        arquivo: 'src/features/trocas/components/Mercado/index.jsx',
        fonte: mercadoFonte,
        marcador: 'function Mercado()',
        depois: 8,
        explicacao: 'O Mercado só escolhe a subtela; cada subtela tem o seu componente e o seu ViewModel.',
      },
    ],
  },
  {
    id: 'SOLID-O',
    nome: 'Aberto/fechado',
    resumo: 'Dá para estender sem editar o que já funciona.',
    exemplos: [
      {
        arquivo: 'src/App.jsx',
        fonte: appFonte,
        marcador: 'const telas = {',
        depois: 18,
        explicacao: 'Uma tela nova (como esta, "Sobre nós") é só mais uma entrada no mapa, sem mexer nas outras.',
      },
      {
        arquivo: 'src/shared/components/Layout/index.jsx',
        fonte: layoutFonte,
        marcador: 'const MENU = [',
        depois: 10,
        explicacao: 'O menu é montado a partir desta lista: um item novo não muda o JSX do Layout.',
      },
    ],
  },
  {
    id: 'SOLID-L',
    nome: 'Substituição de Liskov',
    resumo: 'Um subtipo pode ser usado onde se espera o tipo base.',
    exemplos: [
      {
        arquivo: 'src/core/services/index_services.js',
        fonte: clienteHttpFonte,
        marcador: '// Erro com a mensagem que o back mandou',
        depois: 6,
        explicacao: 'ErroApi estende Error sem mudar o contrato: continua tendo message e só acrescenta status.',
      },
      {
        arquivo: 'src/features/loja/components/Loja/index_viewmodels.js',
        fonte: lojaViewModelFonte,
        marcador: 'const comprar = async (numeroGeracao)',
        depois: 11,
        explicacao: 'Quem trata o erro só conhece Error (e.message): um ErroApi do back entra no lugar sem nenhuma mudança.',
      },
    ],
  },
  {
    id: 'SOLID-I',
    nome: 'Segregação de interface',
    resumo: 'Cada componente recebe só o que usa.',
    exemplos: [
      {
        arquivo: 'src/features/loja/components/LojaPokebolas/index_viewmodels.js',
        fonte: lojaPokebolasViewModelFonte,
        marcador: 'return {',
        depois: 7,
        explicacao: 'A compra de Pokébolas recebe só pokebolas, podePagar e comprar, e não o usuário inteiro.',
      },
      {
        arquivo: 'src/features/trocas/components/Trocas/index_viewmodels.js',
        fonte: trocasViewModelFonte,
        marcador: '[SOLID-I] Trocas recebia',
        antes: 1,
        depois: 5,
        explicacao: 'Trocas não recebe mais props só para repassar: cada filho lê o que precisa da sessão.',
      },
    ],
  },
  {
    id: 'SOLID-D',
    nome: 'Inversão de dependência',
    resumo: 'Depender de abstrações, não de detalhes.',
    exemplos: [
      {
        arquivo: 'src/features/auth/context/index_context.js',
        fonte: sessaoContextoFonte,
        marcador: '// Treinador logado e ações de conta',
        depois: 8,
        explicacao: 'As telas dependem de useSessao(), não de props vindas do App nem de como a sessão é guardada.',
      },
      {
        arquivo: 'src/features/auth/components/Login/index_viewmodels.js',
        fonte: loginViewModelFonte,
        marcador: 'const entrar = async () =>',
        depois: 14,
        explicacao: 'O ViewModel do login recebe a ação onLogin pronta: não sabe se ela vai para a API, para um mock ou para um teste.',
      },
    ],
  },
];

// Estrutura do repositório, uma visão por botão na seção "Estrutura do projeto".
// Escrita à mão: o front roda sozinho no navegador e não enxerga as pastas do back e dos testes.
export const ESTRUTURAS = [
  {
    valor: 'geral',
    nome: 'Geral',
    resumo: 'O repositório inteiro: front, back, banco e testes, cada um na sua pasta, orquestrados pelo Docker.',
    secoes: [
      {
        titulo: 'Raiz do repositório',
        itens: [
          { caminho: 'front/', descricao: 'Interface em React + Vite (MVVM por funcionalidade)' },
          { caminho: 'back/', descricao: 'API em Node.js + Express: regras do jogo e acesso ao banco' },
          { caminho: 'db/', descricao: 'Esquema do PostgreSQL e migrações' },
          { caminho: 'cypress/', descricao: 'Testes de ponta a ponta (E2E) da interface' },
          { caminho: 'cypress.config.js', descricao: 'Configuração do Cypress e do relatório Mochawesome' },
          { caminho: 'docker-compose.yml', descricao: 'Sobe banco, back e front juntos' },
          { caminho: 'package.json', descricao: 'Dependências e scripts dos testes E2E (cy:open, cy:run)' },
        ],
      },
      {
        titulo: 'Serviços do docker-compose',
        itens: [
          { caminho: 'db', descricao: 'PostgreSQL 16, criado a partir de db/db.sql (porta 5432)' },
          { caminho: 'back', descricao: 'API do jogo (porta 8080), sobe depois que o banco está pronto' },
          { caminho: 'front', descricao: 'Vite em modo de desenvolvimento (porta 5174), repassa /api para o back' },
          { caminho: 'tunel', descricao: 'Opcional (perfil online): expõe o back na internet pelo Cloudflare' },
        ],
      },
    ],
  },
  {
    valor: 'front',
    nome: 'Front',
    resumo: 'MVVM organizado por funcionalidade: cada feature guarda as próprias telas, ViewModels, regras e chamadas ao back, e expõe só o necessário pelo seu index.js.',
    secoes: [
      {
        titulo: 'front/src',
        itens: [
          { caminho: 'main.jsx', descricao: 'Ponto de entrada: CSS global, SessaoProvider e App' },
          { caminho: 'App.jsx', descricao: 'Escolhe qual tela mostrar' },
          { caminho: 'core/', descricao: 'O que é global: cliente HTTP do back (token, erros, chamar())' },
          { caminho: 'shared/', descricao: 'Usado por várias features: componentes base, utilitários, constantes e tipos' },
          { caminho: 'features/', descricao: 'Uma pasta por funcionalidade' },
          { caminho: '  auth/', descricao: 'Login, cadastro, recuperar senha e a sessão' },
          { caminho: '  pokedex/', descricao: 'Pokédex com todos os Pokémon' },
          { caminho: '  colecao/', descricao: 'Meus Pokémon: inicial, evolução, cuidados e golpes' },
          { caminho: '  time/', descricao: 'Montagem do time de batalha' },
          { caminho: '  loja/', descricao: 'Compra de Pokémon e Pokébolas' },
          { caminho: '  batalhas/', descricao: 'Batalhas entre treinadores' },
          { caminho: '  historia/', descricao: 'Modo história' },
          { caminho: '  vitrine/', descricao: 'Vitrine pública de cada treinador' },
          { caminho: '  trocas/', descricao: 'Mercado, anúncios e propostas' },
          { caminho: '  sobre/', descricao: 'Esta aba' },
        ],
      },
      {
        titulo: 'Dentro de cada feature',
        itens: [
          { caminho: 'components/<Nome>/index.jsx', descricao: 'View: só JSX e estado visual' },
          { caminho: 'components/<Nome>/index_viewmodels.js', descricao: 'ViewModel: estado e ações do componente' },
          { caminho: 'components/<Nome>/<Nome>.css', descricao: 'Estilos do componente' },
          { caminho: 'services/index_services.js', descricao: 'Endpoints do back usados pela feature' },
          { caminho: 'models/index_models.js', descricao: 'Model: regras de negócio, sem React' },
          { caminho: 'constants/ types/ utils/ hooks/ context/ validators/', descricao: 'Só quando a feature precisa' },
          { caminho: 'index.js', descricao: 'Fachada: o que o resto do sistema pode importar' },
        ],
      },
    ],
  },
  {
    valor: 'back',
    nome: 'Back',
    resumo: 'API em Node.js com Express e PostgreSQL. As rotas só traduzem HTTP; as regras do jogo ficam em src/jogo, uma área por arquivo.',
    secoes: [
      {
        titulo: 'back/',
        itens: [
          { caminho: 'server.js', descricao: 'Lê o .env e sobe o servidor' },
          { caminho: 'src/app.js', descricao: 'App Express sem o listen (os testes sobem numa porta qualquer); repassa /api/pokeapi' },
          { caminho: 'src/rotas.js', descricao: 'Endpoints do jogo; erros de regra voltam como 400 { erro }' },
          { caminho: 'src/db.js', descricao: 'Conexão com o PostgreSQL' },
          { caminho: 'test/', descricao: 'Testes de integração: sobem o app, chamam os endpoints e conferem o banco' },
        ],
      },
      {
        titulo: 'back/src/jogo',
        itens: [
          { caminho: 'config.js', descricao: 'Regras de balanceamento, ajustáveis sem mexer na lógica' },
          { caminho: 'regras.js', descricao: 'Regras puras, sem banco: mint, status e XP' },
          { caminho: 'motor.js', descricao: 'Motor de batalha puro: estado + ação → novo estado' },
          { caminho: 'tipos.js', descricao: 'Vantagens de tipo (2x, 0,5x, 0x)' },
          { caminho: 'aleatorio.js', descricao: 'Sorteios aleatórios' },
          { caminho: 'erros.js', descricao: 'Erro de regra do jogo, devolvido como 400' },
          { caminho: 'usuarios.js', descricao: 'Contas, escolha do inicial, loja e time' },
          { caminho: 'pokemons.js', descricao: 'Cards: mint, coleção, XP, evolução e cuidados' },
          { caminho: 'especies.js', descricao: 'Cache local da Pokédex, buscada na PokeAPI uma vez só' },
          { caminho: 'golpes.js', descricao: 'Cache dos golpes da PokeAPI e a roleta de golpes' },
          { caminho: 'batalhas.js', descricao: 'Batalhas assíncronas: desafio, jogadas, prazo e recompensas' },
          { caminho: 'agendador.js', descricao: 'A cada minuto aplica as jogadas com prazo vencido' },
          { caminho: 'historia.js', descricao: 'Trilhas, Pokémon selvagens e captura' },
          { caminho: 'trocas.js', descricao: 'Mercado: anúncios, compra direta e propostas' },
          { caminho: 'vitrines.js', descricao: 'Perfil público de cada treinador' },
        ],
      },
    ],
  },
  {
    valor: 'banco',
    nome: 'Banco de dados',
    resumo: 'PostgreSQL. O esquema completo fica em db.sql e cada mudança posterior vira uma migração numerada.',
    secoes: [
      {
        titulo: 'db/',
        itens: [
          { caminho: 'db.sql', descricao: 'Esquema completo, executado na primeira subida do container' },
          { caminho: 'migracoes/', descricao: 'Mudanças em bancos já existentes, numeradas em ordem (001, 002...)' },
        ],
      },
      {
        titulo: 'Principais tabelas',
        itens: [
          { caminho: 'usuarios, sessoes', descricao: 'Treinadores e logins ativos' },
          { caminho: 'especies, golpes', descricao: 'Cache local dos dados da PokeAPI' },
          { caminho: 'pokemons, cuidados', descricao: 'Cards dos treinadores e o histórico de cuidados' },
          { caminho: 'batalhas, batalha_acoes', descricao: 'Batalhas entre treinadores e cada jogada' },
          { caminho: 'historia_encontros', descricao: 'Pokémon selvagens encontrados na história' },
          { caminho: 'anuncios, propostas, proposta_pokemons', descricao: 'Mercado de trocas' },
          { caminho: 'transacoes_pokecoins', descricao: 'Extrato de Pokécoins' },
          { caminho: 'vitrines', descricao: 'Perfil público de cada treinador' },
        ],
      },
    ],
  },
  {
    valor: 'testes',
    nome: 'Testes (Cypress)',
    resumo: 'Testes de ponta a ponta com Cypress no padrão Page Objects, com relatório em HTML pelo Mochawesome.',
    secoes: [
      {
        titulo: 'cypress/',
        itens: [
          { caminho: 'e2e/login/login.cy.js', descricao: 'Cenários da tela de login: interface e validações' },
          { caminho: 'fixtures/login.json', descricao: 'Dados e mensagens esperadas usados nos testes' },
          { caminho: 'support/pageObjects/', descricao: 'Page Objects: as ações de cada tela' },
          { caminho: 'support/locators/', descricao: 'Seletores dos elementos de cada tela, num lugar só' },
          { caminho: 'support/commands.js', descricao: 'Comandos customizados do Cypress' },
          { caminho: 'support/e2e.js', descricao: 'Configuração carregada antes de cada teste' },
        ],
      },
      {
        titulo: 'Como rodar (na raiz do repositório)',
        itens: [
          { caminho: 'npm run cy:open', descricao: 'Abre o Cypress com interface, para acompanhar os testes' },
          { caminho: 'npm run cy:run', descricao: 'Roda todos os testes no terminal e gera o relatório' },
          { caminho: 'cypress.env.json', descricao: 'Endereço do app (baseUrl) e treinador/senha dos testes de login real' },
        ],
      },
    ],
  },
];
