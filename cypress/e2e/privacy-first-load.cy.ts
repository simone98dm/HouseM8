import { STORAGE_ITEMS } from '../../app/utils/legal/cookies';

// Privacy gate: a first visit must set only documented cookies and contact
// only our own origin (no trackers, CDNs, fonts, analytics).
const COOKIE_ALLOWLIST = STORAGE_ITEMS.filter((i) => i.kind === 'cookie').map(
  (i) => i.name,
);

describe('privacy: first load', () => {
  ['/', '/auth/login'].forEach((path) => {
    it(`${path} sets only allowlisted cookies and calls no third party`, () => {
      const foreign: string[] = [];
      cy.intercept({ url: '**' }, (req) => {
        const url = new URL(req.url);
        if (url.origin !== Cypress.config('baseUrl')) foreign.push(req.url);
      });

      cy.visit(path);
      cy.get('body').should('be.visible');

      cy.getAllCookies().then((cookies) => {
        const unexpected = cookies
          .map((c) => c.name)
          .filter((n) => !COOKIE_ALLOWLIST.includes(n));
        expect(unexpected, 'cookies outside allowlist').to.deep.equal([]);
      });
      cy.then(() => expect(foreign, 'third-party requests').to.deep.equal([]));
    });
  });
});
