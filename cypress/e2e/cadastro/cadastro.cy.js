const senha = 'Pikachu123!';

// Apenas preenchimento repetido; os cenários e as asserções ficam neste arquivo.
function preencherCadastro({ celular = '11987654321', novaSenha = senha, confirmacao = novaSenha } = {}) {
  cy.get('#cadastro-treinador').type('  ash_cypress  ');
  cy.get('#cadastro-celular').type(celular);
  cy.get('#cadastro-senha').type(novaSenha, { log: false });
  cy.get('#cadastro-confirmar-senha').type(confirmacao, { log: false });
}

describe('Cadastro - principais fluxos do front (API simulada)', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/saude', { statusCode: 200, body: { ok: true } });
    cy.intercept('POST', '**/api/presenca', { statusCode: 204 });
    // Impede que um envio inesperado crie uma conta real.
    cy.intercept('POST', '**/api/auth/cadastro', {
      statusCode: 400,
      body: { erro: 'Esse login já está em uso.' },
      log: false,
    }).as('cadastro');
    cy.visit('/cadastro');
  });

  it('deve aplicar os limites dos campos, alternar as senhas e voltar ao login', () => {
    cy.contains('.cadastro-title', 'PokeBox').should('be.visible');
    const treinadorLongo = 'treinador_com_nome_muito_longo';
    cy.get('#cadastro-treinador').type(treinadorLongo)
      .should('have.value', treinadorLongo.slice(0, 20));
    cy.get('#cadastro-celular').type('1198765432199').should('have.value', '(11) 98765-4321');
    cy.get('#cadastro-senha').type(senha, { log: false }).should('have.attr', 'type', 'password');
    cy.get('#cadastro-confirmar-senha').type(senha, { log: false }).should('have.attr', 'type', 'password');

    cy.get('button[aria-label="Mostrar senha"]').click();
    cy.get('#cadastro-senha, #cadastro-confirmar-senha').each(($campo) => {
      cy.wrap($campo).should('have.attr', 'type', 'text').and('have.value', senha);
    });
    cy.get('button[aria-label="Ocultar senha"]').click();
    cy.get('#cadastro-senha, #cadastro-confirmar-senha').each(($campo) => {
      cy.wrap($campo).should('have.attr', 'type', 'password').and('have.value', senha);
    });
    cy.get('@cadastro.all').should('have.length', 0);
    cy.contains('.cadastro-register-button', 'Entrar').click();
    cy.location('pathname').should('eq', '/login');
    cy.get('.login-page').should('be.visible');
  });

  it('deve impedir o cadastro com campos obrigatórios vazios', () => {
    cy.get('.cadastro-submit').click();
    cy.get('[role="alert"]').should('have.text', 'Preencha todos os campos para continuar.');
    cy.get('.cadastro-submit').should('be.enabled');
    cy.get('@cadastro.all').should('have.length', 0);
  });

  it('deve rejeitar celular incompleto mesmo com os demais campos preenchidos', () => {
    preencherCadastro({ celular: '1198765432' });
    cy.get('.cadastro-submit').click();
    cy.get('[role="alert"]').should('have.text', 'Informe um celular válido com DDD.');
    cy.get('@cadastro.all').should('have.length', 0);
  });

  it('deve rejeitar senha com menos de oito caracteres', () => {
    preencherCadastro({ novaSenha: 'Pika123' });
    cy.get('.cadastro-submit').click();
    cy.get('[role="alert"]').should('have.text', 'A senha precisa ter pelo menos 8 caracteres.');
    cy.get('@cadastro.all').should('have.length', 0);
  });

  it('deve rejeitar a confirmação diferente da senha', () => {
    preencherCadastro({ confirmacao: 'OutraSenha123!' });
    cy.get('.cadastro-submit').click();
    cy.get('[role="alert"]').should('have.text', 'As senhas não conferem.');
    cy.get('@cadastro.all').should('have.length', 0);
  });

  it('deve informar login já utilizado e manter o formulário disponível para correção', () => {
    preencherCadastro();
    cy.get('.cadastro-submit').click();
    cy.wait('@cadastro').its('response.statusCode').should('eq', 400);
    cy.get('[role="alert"]').should('be.visible').and('have.text', 'Esse login já está em uso.');
    cy.get('#cadastro-celular').should('have.value', '(11) 98765-4321');
    cy.get('#cadastro-treinador').clear().type('outro_treinador');
    cy.get('.cadastro-submit').should('be.enabled').and('have.text', 'Começar minha jornada!');
    cy.location('pathname').should('eq', '/cadastro');
    cy.window().then((janela) => {
      expect(janela.localStorage.getItem('pokebox-token')).to.eq(null);
    });
  });

  it('deve cadastrar, bloquear envios durante a espera e abrir a escolha do Pokémon inicial', () => {
    const usuario = { id: 101, login: 'ash_cypress', pokecoins: 100, pokebolas: 0 };
    let liberarResposta;
    const respostaPendente = new Cypress.Promise((resolve) => { liberarResposta = resolve; });
    cy.intercept('POST', '**/api/auth/cadastro', (req) => respostaPendente.then(() => req.reply({
      statusCode: 201, body: { token: 'token-ficticio-cadastro', usuario }, log: false,
    }))).as('cadastroSucesso');
    cy.intercept('GET', '**/api/eu', { body: { usuario, pokemons: [] } }).as('perfilNovo');
    // Mantém o tutorial fechado para verificar o destino do cadastro.
    cy.window().then((janela) => janela.localStorage.setItem('pokebox-tutorial:101', 'fim'));

    preencherCadastro();
    cy.get('.cadastro-submit').click();
    cy.get('.cadastro-submit').should('be.disabled').and('have.text', 'Cadastrando...');
    cy.then(() => liberarResposta());
    cy.wait('@cadastroSucesso').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ login: 'ash_cypress', celular: '11987654321', senha });
      expect(response.statusCode).to.eq(201);
    });
    cy.wait('@perfilNovo');
    cy.location('pathname').should('eq', '/meus-pokemons');
    cy.contains('.layout-usuario', usuario.login).should('be.visible');
    cy.contains('h2', 'Escolha seu Pokémon inicial').should('be.visible');
    cy.get('.cadastro-page').should('not.exist');
    cy.get('@cadastroSucesso.all').should('have.length', 1);
    cy.window().then((janela) => {
      expect(janela.localStorage.getItem('pokebox-token')).to.eq('token-ficticio-cadastro');
    });
  });
});
