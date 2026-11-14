const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('cypress');
const { allureCypress } = require('allure-cypress/reporter');
const cypressOnFix = require('cypress-on-fix');

const envPath = path.join(__dirname, 'cypress.env.json');
const localEnv = existsSync(envPath)
  ? JSON.parse(readFileSync(envPath, 'utf8'))
  : {};

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
    baseUrl: process.env.CYPRESS_BASE_URL || localEnv.baseUrl || 'http://localhost:5174',
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
