/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      stubBaseline(): Chainable<void>;
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('stubBaseline', () => {
  // Catch-all so no stray dashboard/page GET hits the real server and 401s —
  // a 401 triggers the api client's refresh+logout, bouncing tests to /auth/login.
  // Specific intercepts below (and per-spec) are registered later, so they win.
  cy.intercept('GET', '/api/**', {
    body: {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
    },
  });
  cy.intercept('GET', '/api/users/me', { fixture: 'user.json' }).as('me');
  cy.intercept('GET', '/api/feature-flags', {
    fixture: 'feature-flags.json',
  }).as('flags');
  // The same /api/houses path serves both the dashboard list and the single
  // "current house" lookup (?current=true, which expects { data: House }, not a
  // list). A glob can't disambiguate the query, so branch in one handler.
  cy.intercept('GET', '/api/houses*', (req) => {
    if (req.query.current === 'true') {
      req.reply({ fixture: 'current-house.json' });
    } else {
      req.reply({ fixture: 'houses.json' });
    }
  }).as('houses');
  cy.intercept('GET', '/api/houses/*/members', {
    fixture: 'members.json',
  }).as('members');
});

Cypress.Commands.add('login', () => {
  cy.stubBaseline();
  // Middleware authenticates off GET /api/users/me succeeding (userStore.fetchCurrentUser).
  // The api client checks the access-token cookie before issuing requests.
  cy.setCookie('house_m8_access_token', 'e2e-fake-jwt');
});

export {};
