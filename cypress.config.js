const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('cypress');

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
    baseUrl: localEnv.baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
      return config;
    },
  },
});
