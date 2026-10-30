import en from '../support/i18n';

const USER_ID = '11111111-1111-1111-1111-111111111111';

describe('Auth', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/feature-flags', {
      fixture: 'feature-flags.json',
    });
    // Unauthenticated by default so the auth pages render (not redirected away).
    // Use 200 { data: null } rather than 401 — a 401 would trigger the api
    // client's refresh+logout, which re-navigates and detaches form elements
    // mid-interaction. A null user reads as "not signed in" with no churn.
    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { data: null },
    }).as('meUnauth');
  });

  it('email login redirects to the dashboard', () => {
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 200,
      body: { user: { id: USER_ID, email: 'mario.rossi@example.com' } },
    }).as('signin');
    cy.visit('/auth/login');
    // The login page does a one-time remount shortly after hydration which clears
    // form state; let it settle before typing. ponytail: fixed settle, swap for a
    // hydration sentinel if this proves flaky.
    cy.wait(2000);
    cy.get('input[type="email"]').type('mario.rossi@example.com');
    cy.get('input[type="password"]').type('Password123!');
    // After sign-in the app re-fetches /me and loads the dashboard, so switch to
    // the authenticated baseline (this overrides the 401 /me above).
    cy.stubBaseline();
    cy.get('button[type="submit"]').click({ force: true });
    cy.wait('@signin')
      .its('request.body')
      .should('include', { email: 'mario.rossi@example.com' });
    cy.location('pathname').should('eq', '/dashboard');
  });

  it('shows an error on invalid credentials', () => {
    // The page renders the API error message inline; statusMessage drives it.
    cy.intercept('POST', '/api/auth/signin', {
      statusCode: 401,
      body: { statusMessage: 'Invalid credentials' },
    }).as('badSignin');
    cy.visit('/auth/login');
    // The login page does a one-time remount shortly after hydration which clears
    // form state; let it settle before typing. ponytail: fixed settle, swap for a
    // hydration sentinel if this proves flaky.
    cy.wait(2000);
    cy.get('input[type="email"]').type('x@y.z');
    cy.get('input[type="password"]').type('wrong');
    cy.get('button[type="submit"]').click({ force: true });
    cy.wait('@badSignin');
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  // Email-first registration: the page collects only email + consent. Name and
  // password are set later in the onboarding wizard (see onboarding.cy.ts).
  it('registers a new account (email-first) and shows the check-inbox state', () => {
    cy.intercept('POST', '/api/auth/register', {
      statusCode: 200,
      body: {
        success: true,
        message: 'If this email is new, a link is on its way',
      },
    }).as('register');
    cy.visit('/auth/register');
    cy.get('#email').type('giulia.neri@example.com');
    cy.get('#consent-checkbox').check({ force: true });
    cy.contains('button', en.auth.signUp.button).click();
    cy.wait('@register')
      .its('request.body')
      .should('include', { email: 'giulia.neri@example.com' });
    // Success state — the page swaps to the "check your email" panel.
    cy.contains(en.auth.register.emailSent.title).should('be.visible');
  });

  // Anti-enumeration: an already-registered email must be indistinguishable
  // from a brand-new one — same success panel, no error surfaced.
  it('shows the same success state for an already-registered email', () => {
    cy.intercept('POST', '/api/auth/register', {
      statusCode: 200,
      body: {
        success: true,
        message: 'If this email is new, a link is on its way',
      },
    }).as('register');
    cy.visit('/auth/register');
    cy.get('#email').type('existing@example.com');
    cy.get('#consent-checkbox').check({ force: true });
    cy.contains('button', en.auth.signUp.button).click();
    cy.wait('@register');
    cy.contains(en.auth.register.emailSent.title).should('be.visible');
    cy.get('[role="alert"]').should('not.exist');
  });

  it('logs out from the profile page', () => {
    cy.login();
    cy.intercept('GET', `/api/users/${USER_ID}`, { fixture: 'user.json' });
    cy.intercept('POST', '/api/auth/signout', {
      statusCode: 200,
      body: { message: 'ok' },
    }).as('signout');
    cy.visit(`/user/${USER_ID}`);
    cy.contains('button', en.auth.signOut).click();
    cy.wait('@signout');
    cy.location('pathname').should('eq', '/auth/login');
  });

  // ponytail: Google OAuth bounces to an external provider (location.href =
  // '/api/auth/google'); we can only assert the app initiates the flow.
  // Upgrade path: a hybrid real-backend run that exercises the callback.
  it('initiates Google OAuth', () => {
    cy.intercept('GET', '/api/auth/google', {
      statusCode: 200,
      body: 'oauth-stub',
    }).as('google');
    cy.visit('/auth/login');
    cy.contains('button', en.auth.login.googleButton).click();
    cy.wait('@google');
  });
});
