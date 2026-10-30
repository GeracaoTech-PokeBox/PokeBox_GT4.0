import { loginLocators as locators } from '../locators/login.locators';

class LoginPage {
  visitar(opcoes = {}) {
    return cy.visit('/', opcoes);
  }

  preencherTreinador(treinador = '') {
    const campo = cy.get(locators.treinador).clear();
    return treinador ? campo.type(treinador, { parseSpecialCharSequences: false }) : campo;
  }

  preencherSenha(senha = '') {
    const campo = cy.get(locators.senha).clear({ log: false });
    return senha ? campo.type(senha, { log: false, parseSpecialCharSequences: false }) : campo;
  }

  preencherFormulario(treinador, senha) {
    this.preencherTreinador(treinador);
    return this.preencherSenha(senha);
  }

  enviar() {
    return cy.get(locators.entrar).click();
  }

  enviarComEnter() {
    return cy.get(locators.senha).type('{enter}', { log: false });
  }

  mostrarSenha() {
    return cy.get(locators.mostrarSenha).click();
  }

  ocultarSenha() {
    return cy.get(locators.ocultarSenha).click();
  }

  abrirCadastro() {
    return cy.get(locators.cadastrar).click();
  }

  voltarDoCadastro() {
    return cy.get(locators.cadastro.voltar).click();
  }

  abrirRecuperacaoSenha() {
    return cy.get(locators.recuperarSenha).click();
  }

  voltarDaRecuperacao() {
    return cy.get(locators.recuperacao.voltar).click();
  }

  sair() {
    return cy.get(locators.sessao.sair).click();
  }

  validarFormularioVisivel() {
    cy.get(locators.pagina).should('be.visible');
    cy.get(locators.treinador).should('be.visible').and('be.enabled');
    cy.get(locators.senha).should('be.visible').and('be.enabled');
    return this.validarBotaoDisponivel();
  }

  validarEstadoInicial() {
    this.validarFormularioVisivel();
    cy.get(locators.titulo).should('have.text', 'PokeBox');
    cy.get(locators.rotuloTreinador).should('have.text', 'Treinador');
    cy.get(locators.rotuloSenha).should('have.text', 'Senha');
    cy.get(locators.treinador).should('have.value', '').and('have.attr', 'autocomplete', 'username');
    cy.get(locators.senha).should('have.value', '').and('have.attr', 'autocomplete', 'current-password');
    cy.get(locators.cadastrar).should('be.visible').and('have.text', 'Cadastre-se');
    cy.get(locators.recuperarSenha).should('be.visible').and('have.text', 'Esqueci minha senha.');
    this.validarSenhaOculta();
    return this.validarSemErro();
  }

  validarErro(mensagem) {
    return cy.get(locators.erro).should('be.visible').and('have.text', mensagem);
  }

  validarSemErro() {
    return cy.get(locators.erro).should('not.exist');
  }

  validarBotaoDisponivel() {
    return cy.get(locators.entrar).should('be.enabled').and('have.text', 'Eu escolho você!');
  }

  validarCarregamento() {
    return cy.get(locators.entrar).should('be.disabled').and('have.text', 'Entrando...');
  }

  validarSenhaOculta() {
    cy.get(locators.senha).should('have.attr', 'type', 'password');
    return cy.get(locators.mostrarSenha).should('be.visible').and('have.text', 'Mostrar');
  }

  validarSenhaVisivel() {
    cy.get(locators.senha).should('have.attr', 'type', 'text');
    return cy.get(locators.ocultarSenha).should('be.visible').and('have.text', 'Ocultar');
  }

  // Usado apenas com a senha fictícia da fixture no teste de mostrar/ocultar.
  validarValorSenha(senha) {
    return cy.get(locators.senha).should('have.value', senha);
  }

  validarLimiteTreinador(valorDigitado) {
    return cy.get(locators.treinador)
      .should('have.attr', 'maxlength', '20')
      .and('have.value', valorDigitado.slice(0, 20));
  }

  validarCadastroVisivel() {
    cy.get(locators.pagina).should('not.exist');
    cy.get(locators.cadastro.pagina).should('be.visible');
    cy.get(locators.cadastro.treinador).should('be.visible');
    return cy.get(locators.cadastro.celular).should('be.visible');
  }

  validarRecuperacaoVisivel() {
    cy.get(locators.pagina).should('not.exist');
    cy.get(locators.recuperacao.pagina).should('be.visible');
    cy.get(locators.recuperacao.treinador).should('be.visible');
    return cy.get(locators.recuperacao.celular).should('be.visible');
  }

  validarSessaoArmazenada(existe) {
    return cy.window({ log: false }).should((janela) => {
      expect(Boolean(janela.localStorage.getItem('pokebox-token')), 'sessão armazenada').to.eq(existe);
    });
  }

  validarDeslogado() {
    this.validarFormularioVisivel();
    cy.get(locators.sessao.pagina).should('not.exist');
    return this.validarSessaoArmazenada(false);
  }

  validarLoginSucesso({ usuario, pokemons }) {
    cy.get(locators.pagina).should('not.exist');
    cy.get(locators.sessao.pagina).should('be.visible');
    cy.get(locators.sessao.treinador).should('have.text', usuario.login);
    cy.get(locators.sessao.menuAtivo)
      .should('have.text', pokemons.length === 0 ? 'Meus Pokémon' : 'Batalhas');
    cy.get(locators.sessao.sair).should('be.visible');
    return this.validarSessaoArmazenada(true);
  }
}

export default new LoginPage();
