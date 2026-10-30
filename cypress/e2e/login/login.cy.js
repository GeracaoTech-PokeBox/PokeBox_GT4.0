import loginPage from '../../support/pageObjects/login.page';
import { dados, mensagens } from '../../fixtures/login.json';

describe('Login - interface e validações de preenchimento', () => {
  beforeEach(() => {
    cy.monitorarAutenticacao();
    loginPage.visitar();
  });

  it('deve exibir os campos, os rótulos e as ações no estado inicial', () => {
    loginPage.validarEstadoInicial();
    loginPage.validarDeslogado();
  });

  it('deve mostrar e ocultar a senha sem apagar o valor digitado', () => {
    loginPage.preencherSenha(dados.senha);
    loginPage.validarSenhaOculta();
    loginPage.mostrarSenha();
    loginPage.validarSenhaVisivel();
    loginPage.validarValorSenha(dados.senha);
    loginPage.ocultarSenha();
    loginPage.validarSenhaOculta();
    loginPage.validarValorSenha(dados.senha);
    cy.get('@login.all').should('have.length', 0);
  });

  it('deve limitar o treinador a 20 caracteres', () => {
    loginPage.preencherTreinador(dados.treinadorLongo);
    loginPage.validarLimiteTreinador(dados.treinadorLongo);
  });

  it('deve abrir o cadastro e permitir voltar ao login', () => {
    loginPage.abrirCadastro();
    loginPage.validarCadastroVisivel();
    loginPage.voltarDoCadastro();
    loginPage.validarEstadoInicial();
  });

  it('deve abrir a recuperação de senha e permitir voltar ao login', () => {
    loginPage.abrirRecuperacaoSenha();
    loginPage.validarRecuperacaoVisivel();
    loginPage.voltarDaRecuperacao();
    loginPage.validarEstadoInicial();
  });

  const camposInvalidos = [
    { cenario: 'ambos os campos vazios', treinador: '', senha: '' },
    { cenario: 'treinador vazio', treinador: '', senha: dados.senha },
    { cenario: 'senha vazia', treinador: dados.treinador, senha: '' },
    { cenario: 'treinador contendo somente espaços', treinador: '   ', senha: dados.senha },
  ];

  camposInvalidos.forEach(({ cenario, treinador, senha }) => {
    it(`deve impedir o envio com ${cenario}`, () => {
      loginPage.preencherFormulario(treinador, senha);
      loginPage.enviar();
      loginPage.validarErro(mensagens.camposObrigatorios);
      loginPage.validarDeslogado();
      cy.get('@login.all').should('have.length', 0);
    });
  });
});

describe('Login - tratamento de falhas com respostas simuladas', () => {
  beforeEach(() => {
    cy.monitorarAutenticacao();
  });

  const falhas = [
    { cenario: 'limite de tentativas', statusCode: 429, mensagem: mensagens.limiteTentativas },
    { cenario: 'erro interno', statusCode: 500, mensagem: mensagens.erroInterno },
    { cenario: 'banco indisponível', statusCode: 503, mensagem: mensagens.bancoIndisponivel },
  ];

  falhas.forEach(({ cenario, statusCode, mensagem }) => {
    it(`deve exibir a mensagem de ${cenario} e liberar uma nova tentativa`, () => {
      cy.intercept({ method: 'POST', pathname: '/api/auth/login' }, {
        statusCode, body: { erro: mensagem }, log: false,
      }).as('falhaLogin');
      loginPage.visitar();
      loginPage.preencherFormulario(dados.treinador, dados.senha);
      loginPage.enviar();
      cy.aguardarResposta('@falhaLogin', statusCode);
      loginPage.validarErro(mensagem);
      loginPage.validarDeslogado();
    });
  });

  it('deve informar falha de conexão quando a requisição não recebe resposta', () => {
    cy.intercept({ method: 'POST', pathname: '/api/auth/login' }, {
      forceNetworkError: true, log: false,
    }).as('falhaRede');
    loginPage.visitar();
    loginPage.preencherFormulario(dados.treinador, dados.senha);
    loginPage.enviar();
    cy.wait('@falhaRede', { log: false }).should('have.property', 'error');
    loginPage.validarErro(mensagens.falhaConexao);
    loginPage.validarDeslogado();
  });

  it('deve informar resposta inesperada quando o servidor retorna HTML', () => {
    cy.intercept({ method: 'POST', pathname: '/api/auth/login' }, {
      statusCode: 502,
      headers: { 'content-type': 'text/html' },
      body: '<html><body>Bad Gateway</body></html>',
      log: false,
    }).as('respostaInvalida');
    loginPage.visitar();
    loginPage.preencherFormulario(dados.treinador, dados.senha);
    loginPage.enviar();
    cy.aguardarResposta('@respostaInvalida', 502);
    loginPage.validarErro(mensagens.respostaInvalida);
    loginPage.validarDeslogado();
  });

  it('deve desabilitar o botão durante o envio e remover o erro da tentativa anterior', () => {
    let liberarResposta;
    const respostaPendente = new Cypress.Promise((resolve) => { liberarResposta = resolve; });

    cy.intercept({ method: 'POST', pathname: '/api/auth/login' }, (req) => {
      return respostaPendente.then(() => req.reply({
        statusCode: 400, body: { erro: mensagens.credenciaisInvalidas }, log: false,
      }));
    }).as('loginPendente');

    loginPage.visitar();
    loginPage.enviar();
    loginPage.validarErro(mensagens.camposObrigatorios);
    loginPage.preencherFormulario(dados.treinador, dados.senha);
    loginPage.enviar();
    loginPage.validarCarregamento();
    loginPage.validarSemErro();
    cy.then(() => liberarResposta());
    cy.aguardarResposta('@loginPendente', 400);
    loginPage.validarErro(mensagens.credenciaisInvalidas);
    loginPage.validarDeslogado();
    cy.get('@loginPendente.all').should('have.length', 1);
  });

  it('deve voltar ao login e remover uma sessão salva que expirou', () => {
    cy.intercept({ method: 'GET', pathname: '/api/eu' }, {
      statusCode: 401, body: { erro: mensagens.sessaoExpirada }, log: false,
    }).as('sessaoExpirada');
    loginPage.visitar({
      onBeforeLoad(janela) {
        janela.localStorage.setItem('pokebox-token', 'sessaoexpiradafixture');
      },
    });
    cy.aguardarResposta('@sessaoExpirada', 401);
    loginPage.validarEstadoInicial();
    loginPage.validarDeslogado();
  });
});
