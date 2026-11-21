const { readFileSync } = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('cypress');
const { allureCypress } = require('allure-cypress/reporter');
const cypressOnFix = require('cypress-on-fix');

let ambiente;
try {
  ambiente = JSON.parse(readFileSync(path.join(__dirname, 'cypress.env.json'), 'utf8'));
} catch {
  throw new Error('Crie um cypress.env.json válido a partir de cypress.env.example.json. No GitHub Actions, configure o secret CYPRESS_ENV_JSON.');
}
if (typeof ambiente?.baseUrl !== 'string' || !/^https?:\/\//.test(ambiente.baseUrl)) {
  throw new Error('Defina baseUrl com a URL do site em cypress.env.json.');
}

module.exports = defineConfig({
  viewportWidth: 1366,
  viewportHeight: 768,
  video: false,
  screenshotOnRunFailure: false,
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    reportFilename: 'index',
    reportPageTitle: 'PokeBox - Testes E2E',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    saveJson: true,
    overwrite: true,
  },
  e2e: {
    // URL e credenciais vêm do mesmo arquivo; o Cypress carrega as credenciais para cy.env().
    baseUrl: ambiente.baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Os dois relatórios precisam receber os eventos after:spec e after:run.
      const register = cypressOnFix(on);
      require('cypress-mochawesome-reporter/plugin')(register);
      allureCypress(register, config, { resultsDir: 'allure-results' });
      return config;
    },
  },
});
