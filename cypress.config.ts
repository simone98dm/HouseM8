import { defineConfig } from 'cypress';

export default defineConfig({
  // No Cypress.env() usage in this project, so keep the insecure default off —
  // this silences the deprecation warning and blocks browser code from reading env.
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    // Explicit (also the default): before each test Cypress clears cookies,
    // localStorage and sessionStorage on all domains — so the auth cookie set by
    // cy.login() and the `auth_redirect` sessionStorage key never leak across tests.
    testIsolation: true,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    fixturesFolder: 'cypress/fixtures',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config;
    },
  },
});
