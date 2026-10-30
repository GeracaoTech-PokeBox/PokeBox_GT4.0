import loginPage from './pageObjects/login.page';

Cypress.Commands.add('obterCredenciais', () => {
  return cy.env(['treinador', 'senha'], { log: false }).then((credenciais) => {
    if (typeof credenciais.treinador !== 'string' || !credenciais.treinador.trim()
      || typeof credenciais.senha !== 'string' || !credenciais.senha) {
      throw new Error('Configure treinador e senha em cypress.env.json para os testes de autenticação real.');
    }
    return credenciais;
  });
});

Cypress.Commands.add('monitorarAutenticacao', () => {
  // O 304 reutiliza o cache do navegador e não traz o JSON que os testes validam.
  // O middleware roda antes dos spies e das respostas simuladas, inclusive o 401.
  cy.intercept({ method: 'GET', pathname: '/api/eu', middleware: true }, (req) => {
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];
    req.on('before:response', (res) => {
      res.headers['cache-control'] = 'no-store';
    });
  });

  // pathname também identifica a API quando o frontend usa outro domínio.
  // log:false evita imprimir corpos de login e tokens no Command Log.
  cy.intercept({ method: 'POST', pathname: '/api/auth/login' }, { log: false }).as('login');
  cy.intercept({ method: 'GET', pathname: '/api/eu' }, { log: false }).as('sessao');
  return cy.intercept({ method: 'POST', pathname: '/api/auth/sair' }, { log: false }).as('sair');
});

Cypress.Commands.add('aguardarResposta', (alias, statusEsperado) => {
  return cy.wait(alias, { log: false, requestTimeout: 15000, responseTimeout: 45000 })
    .then(({ response }) => {
      expect(response?.statusCode, `status de ${alias}`).to.eq(statusEsperado);
      return response.body;
    });
});

// Autenticação pela interface, sem cache de sessão nem resposta simulada.
Cypress.Commands.add('login', () => {
  cy.monitorarAutenticacao();
  loginPage.visitar();
  return cy.obterCredenciais().then(({ treinador, senha }) => {
    loginPage.preencherFormulario(treinador, senha);
    loginPage.enviar();
    cy.aguardarResposta('@login', 200);
    return cy.aguardarResposta('@sessao', 200).then((perfil) => {
      expect(perfil.usuario.login.toLowerCase(), 'treinador autenticado').to.eq(treinador.trim().toLowerCase());
      loginPage.validarLoginSucesso(perfil);
    });
  });
});

Cypress.Commands.add('logout', () => {
  loginPage.sair();
  cy.aguardarResposta('@sair', 204);
  return loginPage.validarDeslogado();
});
