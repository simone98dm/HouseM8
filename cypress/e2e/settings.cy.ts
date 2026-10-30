import en from '../support/i18n';

describe('Settings', () => {
  beforeEach(() => cy.login());

  describe('Privacy / GDPR', () => {
    it('exports account data as JSON', () => {
      cy.intercept('GET', '/api/gdpr/export', {
        statusCode: 200,
        body: { exported_at: '2026-06-27T00:00:00.000Z', profile: {} },
      }).as('export');
      cy.visit('/settings/privacy');
      // Settle the one-time post-hydration remount before interacting.
      cy.wait(1500);
      cy.contains('button', en.gdpr.downloadJson).click();
      cy.wait('@export');
    });

    it('requests account deletion', () => {
      cy.intercept('POST', '/api/gdpr/delete-account', {
        statusCode: 200,
        body: { success: true },
      }).as('del');
      cy.visit('/settings/privacy');
      // Settle the one-time post-hydration remount before interacting.
      cy.wait(1500);
      // requestDeletion() guards with window.confirm, which Cypress auto-accepts.
      cy.contains('button', en.gdpr.deleteButton).click();
      cy.wait('@del').its('request.body').should('include', { confirm: true });
    });

    // ponytail: the "Cancel deletion" control only renders when the user has a
    // pending deletion, and the privacy page reads deleted_at via a server-side
    // useFetch('/api/users/me') that runs in Nitro — outside the browser, so
    // cy.intercept cannot stub it. Covered at the API/unit layer instead.
    // Upgrade path: seed a soft-deleted user against a real backend.
  });

  describe('Subscription', () => {
    // ponytail: /settings/subscription carries `middleware: 'stripe'`, evaluated
    // server-side before the client-only feature-flags plugin runs, so a cold
    // visit always redirects to /dashboard. We assert that real gate behavior;
    // the checkout/portal flows redirect to Stripe-hosted pages and are covered
    // at the API/unit layer. Upgrade path: a Stripe test-mode hybrid run.
    it('redirects a cold visit to /settings/subscription to the dashboard', () => {
      cy.visit('/settings/subscription');
      cy.location('pathname').should('eq', '/dashboard');
    });
  });
});
