import { criarDadosBatalha } from '../../fixtures/batalhas';

describe('Batalhas - principais fluxos do front (API simulada)', { screenshotOnRunFailure: true }, () => {
  let dados;

  // Prepara somente a sessão. As interações e verificações ficam nos próprios testes.
  function visitar(caminho = '/batalhas') {
    cy.visit(caminho, {
      onBeforeLoad(janela) {
        janela.localStorage.setItem('pokebox-token', 'token-ficticio-batalhas');
        janela.localStorage.setItem('pokebox-tutorial:101', 'fim');
      },
    });
    cy.wait('@perfil');
  }

  beforeEach(() => {
    dados = criarDadosBatalha();
    // Cada visita precisa receber o estado deste cenário, sem reaproveitar respostas HTTP.
    cy.intercept({ pathname: '/api/**', middleware: true }, (req) => {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      req.on('before:response', (res) => { res.headers['cache-control'] = 'no-store'; });
    });
    cy.intercept('GET', '**/api/saude', { statusCode: 200, body: { ok: true } });
    cy.intercept('POST', '**/api/presenca', { statusCode: 204 });
    cy.intercept('GET', '**/api/eu', (req) => req.reply(dados.perfil)).as('perfil');
    cy.intercept('GET', '**/api/treinadores/ativos', (req) => req.reply(dados.treinadores)).as('treinadores');
    cy.intercept({ method: 'GET', pathname: '/api/treinadores' }, ['misty_cypress']).as('sugestoes');
    cy.intercept('GET', '**/api/batalhas', (req) => req.reply(dados.lista)).as('listaBatalhas');
    cy.intercept('GET', '**/api/batalhas/301', (req) => req.reply(dados.detalhe)).as('detalheBatalha');
    // Nenhuma ação destes cenários deve chegar ao banco real.
    cy.intercept('POST', '**/api/batalhas', {
      statusCode: 400, body: { erro: 'Desafio não configurado neste cenário.' },
    }).as('desafioBloqueado');
    cy.intercept('POST', '**/api/batalhas/301/jogadas', {
      statusCode: 400, body: { erro: 'Jogada não configurada neste cenário.' },
    }).as('jogadaBloqueada');
  });

  it('deve impedir desafios sem três Pokémon escalados no time', () => {
    dados.perfil.pokemons[2].posicaoTime = null;
    visitar();
    cy.wait(['@listaBatalhas', '@treinadores']);
    cy.contains('h1', 'Batalhas').should('be.visible');
    cy.get('#batalhas-oponente').type('misty_cypress');
    cy.contains('.batalhas-dica', 'Monte um time com 3 Pokémon para poder desafiar.').should('be.visible');
    cy.get('.batalhas-desafiar button[type="submit"]').should('be.disabled');
    cy.contains('.batalhas-ativo button', 'Desafiar').should('be.disabled');
    cy.get('@desafioBloqueado.all').should('have.length', 0);
  });

  it('deve enviar um desafio pelo login e mostrar o convite pendente', () => {
    cy.intercept('POST', '**/api/batalhas', (req) => {
      const convite = { ...dados.detalhe.batalha, status: 'aguardando', minhaVez: false, estado: null };
      dados.lista = [convite];
      dados.treinadores[0].desafioEnviado = true;
      req.reply({ statusCode: 201, body: convite });
    }).as('enviarDesafio');
    visitar();
    cy.wait(['@listaBatalhas', '@treinadores']);
    cy.contains('.jogo-texto', 'Nenhuma batalha ainda. Desafie alguém!').should('be.visible');
    cy.get('.batalhas-desafiar button[type="submit"]').should('be.disabled');
    cy.get('#batalhas-oponente').type('  misty_cypress  ');
    cy.wait('@sugestoes').its('request.query.busca').should('eq', 'misty_cypress');
    cy.get('#batalhas-sugestoes option').should('have.value', 'misty_cypress');
    cy.get('.batalhas-desafiar button[type="submit"]').click();

    cy.wait('@enviarDesafio').its('request.body').should('deep.equal', { oponente: 'misty_cypress' });
    cy.get('[role="status"]').should('contain.text', 'Desafio enviado para misty_cypress!');
    cy.get('#batalhas-oponente').should('have.value', '');
    cy.contains('.batalhas-secao', 'Desafios enviados (1)').should('contain.text', 'Você desafiou misty_cypress');
    cy.contains('.batalhas-ativo', 'misty_cypress').within(() => {
      cy.contains('Desafio enviado').should('be.visible');
      cy.contains('button', 'Desafiar').should('not.exist');
    });
  });

  it('deve aceitar um desafio recebido e abrir o campo de batalha', () => {
    // Do ponto de vista do desafiado, o próprio time está no lado 1.
    dados.detalhe.batalha.souDesafiante = false;
    dados.detalhe.batalha.estado.lados.reverse();
    dados.lista = [{ ...dados.detalhe.batalha, status: 'aguardando', minhaVez: false, estado: null }];
    cy.intercept('POST', '**/api/batalhas/301/responder', (req) => {
      dados.lista = [dados.detalhe.batalha];
      req.reply(dados.detalhe.batalha);
    }).as('aceitarDesafio');
    visitar();
    cy.contains('.batalhas-secao', 'Desafios recebidos (1)').within(() => {
      cy.contains('misty_cypress desafiou você').should('be.visible');
      cy.contains('button', 'Aceitar').click();
    });
    cy.wait('@aceitarDesafio').its('request.body').should('deep.equal', { aceitar: true });
    cy.wait('@detalheBatalha');
    cy.location('pathname').should('eq', '/batalhas/301');
    cy.contains('h1', 'vs misty_cypress').should('be.visible');
    cy.get('[aria-label="Seu time"] .batalha-ativo-info strong').should('have.text', 'Pikachu');
    cy.get('[aria-label="Time de misty_cypress"] .batalha-ativo-info strong').should('have.text', 'Squirtle');
    cy.contains('.batalha-turno', 'Sua vez!').should('be.visible');
    cy.contains('.batalha-acoes button', 'Atacar').should('be.enabled');
  });

  it('deve recusar um desafio recebido e movê-lo para as encerradas', () => {
    dados.lista = [{ ...dados.detalhe.batalha, status: 'aguardando', souDesafiante: false, minhaVez: false, estado: null }];
    cy.intercept('POST', '**/api/batalhas/301/responder', (req) => {
      dados.lista[0].status = 'recusada';
      req.reply(dados.lista[0]);
    }).as('recusarDesafio');
    visitar();
    cy.contains('.batalhas-secao', 'Desafios recebidos (1)').contains('button', 'Recusar').click();
    cy.wait('@recusarDesafio').its('request.body').should('deep.equal', { aceitar: false });
    cy.get('[role="status"]').should('have.text', 'Desafio recusado.');
    cy.contains('h2', 'Desafios recebidos').should('not.exist');
    cy.contains('.batalhas-secao', 'Encerradas (1)').should('contain.text', 'Desafio recusado');
    cy.location('pathname').should('eq', '/batalhas');
  });

  it('deve atacar, atualizar os PS e o histórico e aguardar o turno do oponente', () => {
    cy.intercept('POST', '**/api/batalhas/301/jogadas', (req) => {
      dados.detalhe.batalha.minhaVez = false;
      dados.detalhe.batalha.turno = 2;
      dados.detalhe.batalha.estado.lados[1].pokemons[0].hp = 75;
      dados.detalhe.acoes = [{
        turno: 1, jogadorId: 101, automatica: false, criadaEm: new Date().toISOString(),
        eventos: [{ tipo: 'dano', atacante: 11, alvo: 21, dano: 25, critico: false }],
      }];
      req.reply(dados.detalhe);
    }).as('atacar');
    visitar('/batalhas/301');
    cy.wait('@detalheBatalha');
    cy.get('[aria-label="Time de misty_cypress"] .batalha-hp-texto').should('have.text', '100 / 100 PS');
    cy.contains('.batalha-acoes button', 'Atacar').click();
    cy.wait('@atacar').its('request.body').should('deep.equal', { tipo: 'atacar' });
    cy.get('[aria-label="Time de misty_cypress"] .batalha-hp-texto').should('have.text', '75 / 100 PS');
    cy.get('.batalha-historico').should('contain.text', 'Pikachu causou 25 de dano em Squirtle.');
    cy.get('.batalha-turno').should('contain.text', 'Turno 2 · Vez de misty_cypress');
    cy.get('.batalha-acoes').should('not.exist');
  });

  it('deve trocar para um Pokémon da reserva e retirar os nocauteados das opções', () => {
    dados.detalhe.batalha.estado.lados[0].pokemons[2].hp = 0;
    cy.intercept('POST', '**/api/batalhas/301/jogadas', (req) => {
      dados.detalhe.batalha.estado.lados[0].ativo = 1;
      dados.detalhe.batalha.minhaVez = false;
      dados.detalhe.batalha.turno = 2;
      req.reply(dados.detalhe);
    }).as('trocar');
    visitar('/batalhas/301');
    cy.wait('@detalheBatalha');
    cy.contains('.batalha-acoes button', 'Trocar Pokémon').click().should('have.attr', 'aria-expanded', 'true');
    cy.get('.batalha-trocas button').should('have.length', 1).and('contain.text', 'Bulbasaur');
    cy.contains('.batalha-trocas button', 'Pikachu').should('not.exist');
    cy.contains('.batalha-trocas button', 'Charmander').should('not.exist');
    cy.contains('.batalha-trocas button', 'Bulbasaur').click();
    cy.wait('@trocar').its('request.body').should('deep.equal', { tipo: 'trocar', indice: 1 });
    cy.get('[aria-label="Seu time"] .batalha-ativo-info strong').should('have.text', 'Bulbasaur');
    cy.get('[aria-label="Seu time"] .batalha-banco [data-ativo="true"] img').should('have.attr', 'alt', 'Bulbasaur');
    cy.get('.batalha-trocas').should('not.exist');
  });

  it('deve permitir cancelar a desistência e encerrar a batalha somente após confirmar', () => {
    cy.intercept('POST', '**/api/batalhas/301/jogadas', (req) => {
      Object.assign(dados.detalhe.batalha, {
        status: 'finalizada', minhaVez: false, motivoFim: 'desistencia', venci: false,
      });
      dados.lista = [dados.detalhe.batalha];
      req.reply(dados.detalhe);
    }).as('desistir');
    visitar('/batalhas/301');
    cy.contains('button', 'Desistir da batalha').click();
    cy.contains('Desistir conta como derrota e não dá recompensa.').should('be.visible');
    cy.contains('.batalha-desistir button', 'Cancelar').click();
    cy.contains('button', 'Confirmar desistência').should('not.exist');
    cy.get('@desistir.all').should('have.length', 0);
    cy.contains('.batalha-acoes button', 'Atacar').should('be.enabled');

    cy.contains('button', 'Desistir da batalha').click();
    cy.contains('button', 'Confirmar desistência').click();
    cy.wait('@desistir').its('request.body').should('deep.equal', { tipo: 'desistir' });
    cy.get('.batalha-resultado').should('have.attr', 'data-venci', 'false')
      .and('contain.text', 'Você perdeu por desistência!');
    cy.get('.batalha-acoes, .batalha-desistir').should('not.exist');
    cy.contains('button', '← Batalhas').click();
    cy.location('pathname').should('eq', '/batalhas');
    cy.contains('.batalhas-secao', 'Encerradas (1)').should('contain.text', 'Derrota por desistência');
  });
});
