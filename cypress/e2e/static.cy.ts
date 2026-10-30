// Note: privacy/terms headings are hardcoded literal text in the page components
// (app/pages/privacy.vue, terms.vue) — they are NOT i18n keys, so we assert the
// rendered English copy directly. Locale is forced to `en` in support/e2e.ts.
describe('Static public pages', () => {
  it('renders the privacy page without auth', () => {
    cy.visit('/privacy');
    cy.contains('h1', 'Privacy Policy').should('be.visible');
  });

  it('renders the terms page without auth', () => {
    cy.visit('/terms');
    cy.contains('h1', 'Terms of Service').should('be.visible');
  });

  // ponytail: /pricing carries `middleware: 'stripe'`, which runs server-side on a
  // direct visit where the client-only feature-flags plugin hasn't populated the
  // `showStripe` flag — so SSR redirects to /dashboard. This is the real
  // behavior for a cold load; the page is only reachable via in-app SPA navigation.
  // Upgrade path: drive client-side nav from a page that links to /pricing.
  it('redirects a cold visit to /pricing to the dashboard (stripe gate)', () => {
    cy.login();
    cy.visit('/pricing');
    cy.location('pathname').should('eq', '/dashboard');
  });
});
