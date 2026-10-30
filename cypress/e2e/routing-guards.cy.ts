// Guards from app/middleware/auth.global.ts. Unauthenticated state uses
// 200 { data: null } for /me (a null user) rather than 401, which would trigger
// the api client's refresh+logout churn.
describe('Routing guards', () => {
  const stubUnauth = () => {
    cy.intercept('GET', '/api/feature-flags', {
      fixture: 'feature-flags.json',
    });
    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { data: null },
    }).as('me');
  };

  it('redirects unauthenticated users to login with a redirect query', () => {
    stubUnauth();
    cy.visit('/expenses');
    cy.location('pathname').should('eq', '/auth/login');
    cy.location('search').should('include', 'redirect=/expenses');
  });

  it('redirects authenticated users away from auth pages to the dashboard', () => {
    cy.login();
    cy.visit('/auth/login');
    cy.location('pathname').should('eq', '/dashboard');
  });

  it('allows public pages without authentication', () => {
    stubUnauth();
    cy.visit('/privacy');
    cy.location('pathname').should('eq', '/privacy');
  });
});
