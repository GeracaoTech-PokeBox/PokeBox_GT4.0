// Metas de cobertura do back (unitários + integração juntos), conferidas por `npm run test:cobertura`.
// Se algum número ficar abaixo da meta, o comando (e o CI) falha.
//
// As metas ficam um pouco abaixo do que os testes cobrem hoje (em 11/2026: 99,3% das linhas, 95,9% dos
// ramos, 98,3% das funções): a ideia é pegar quando código novo entra sem teste, não exigir 100%.
// Se a cobertura subir de vez, suba a meta junto.
module.exports = {
  // Todo o src/ somado
  geral: { linhas: 97, ramos: 90, funcoes: 96 },

  // Nenhum arquivo pode ficar abaixo disto
  porArquivo: { linhas: 80 },

  // Regras puras, sem banco nem rede: testar todo caminho é barato e cada erro aqui vira bug no jogo
  arquivos: {
    'src/nucleo/motor.js': { linhas: 100, ramos: 100, funcoes: 100 },
    'src/nucleo/regras.js': { linhas: 100, ramos: 95, funcoes: 100 },
    'src/nucleo/tipos.js': { linhas: 100, ramos: 100, funcoes: 100 },
    'src/features/historia/historia.regras.js': { linhas: 100, ramos: 95, funcoes: 100 },
    'src/compartilhado/aleatorio.js': { linhas: 100, ramos: 100, funcoes: 100 },
  },
};
