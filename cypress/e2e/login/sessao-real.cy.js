describe('Sessão real - usuário configurado em cypress.env.json', () => {
  it('deve entrar com o usuário existente, manter a sessão ao recarregar e sair', () => {
    let usuarioId;

    // Login e consulta de perfil reais, usando treinador/senha de cy.env(), sem stubs.
    cy.login();
    cy.get('@sessao', { log: false }).then(({ response }) => {
      usuarioId = response.body.usuario.id;
      // Fecha apenas os tutoriais deste navegador, sem alterar a conta ou a coleção.
      cy.window({ log: false }).then((janela) => {
        janela.localStorage.setItem(`pokebox-tutorial:${usuarioId}`, 'fim');
        janela.localStorage.setItem(`pokebox-tutorial-cuidados:${usuarioId}`, 'fim');
      });
    });

    cy.reload();
    cy.aguardarResposta('@sessao', 200).then(({ usuario }) => {
      expect(usuario.id, 'mesmo usuário após recarregar').to.eq(usuarioId);
      cy.get('.layout-usuario > span:first-child').should('have.text', usuario.login);
    });
    cy.get('.layout-page').should('be.visible');
    cy.get('.login-page').should('not.exist');

    cy.logout();
    cy.reload();
    cy.get('.login-page').should('be.visible');
    cy.get('.layout-page').should('not.exist');
    cy.window({ log: false }).should((janela) => {
      expect(Boolean(janela.localStorage.getItem('pokebox-token')), 'sessão encerrada').to.eq(false);
    });
  });
});
