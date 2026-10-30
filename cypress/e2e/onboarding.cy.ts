import en from '../support/i18n';

const USER_ID = '11111111-1111-1111-1111-111111111111';

// Types 6 digits into the OtpCodeInput (one <input maxlength="1"> per digit).
// Focus auto-advances, but typing per-index with force is resilient to that.
const typeInviteCode = (code: string) => {
  code.split('').forEach((digit, i) => {
    cy.get('.otp-input').eq(i).type(digit, { force: true });
  });
};

describe('Email confirmation (magic-link)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/feature-flags', {
      fixture: 'feature-flags.json',
    });
    // Confirm page runs while unauthenticated; keep /me quiet (null user, no churn).
    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { data: null },
    });
  });

  it('confirms a valid token and shows the success state', () => {
    cy.intercept('POST', '/api/auth/confirm', {
      statusCode: 200,
      body: { success: true, message: 'ok', data: { user: { id: USER_ID } } },
    }).as('confirm');
    // Visit UNauthenticated: /auth/confirm auto-fires the POST on mount. Do NOT
    // pre-stub an authenticated /me — the auth middleware bounces logged-in users
    // off /auth/* to /dashboard, so the confirm request would never fire.
    cy.visit('/auth/confirm?token=valid-token-123');
    cy.wait('@confirm').its('request.body').should('include', {
      token: 'valid-token-123',
    });
    // Success panel renders (redirect to /dashboard depends on session-restore
    // internals that aren't worth stubbing here — the panel + request prove the flow).
    cy.contains(en.auth.confirmation.success.title).should('be.visible');
  });

  it('shows the expired state and a resend link for an invalid/expired token', () => {
    cy.intercept('POST', '/api/auth/confirm', {
      statusCode: 400,
      body: { statusMessage: 'Invalid or expired verification token' },
    }).as('confirmExpired');
    cy.visit('/auth/confirm?token=expired-token');
    cy.wait('@confirmExpired');
    cy.contains(en.auth.confirmation.expired.title).should('be.visible');
    // Resend routes back to registration to request a fresh link.
    cy.contains('a', en.auth.confirmation.expired.resendButton)
      .should('have.attr', 'href')
      .and('include', '/auth/register');
  });
});

describe('Onboarding wizard', () => {
  // Email-registered first-access user: no name yet → Step 1 (name+password) shows.
  const firstAccessEmailUser = {
    data: {
      id: USER_ID,
      email: 'giulia.neri@example.com',
      is_first_access: true,
      project_id: 'proj-0001',
    },
  };

  // OAuth first-access user: name already provided by the provider → Step 1 skipped.
  const firstAccessOAuthUser = {
    data: {
      id: USER_ID,
      email: 'giulia.neri@example.com',
      first_name: 'Giulia',
      firstName: 'Giulia',
      last_name: 'Neri',
      lastName: 'Neri',
      is_first_access: true,
      project_id: 'proj-0001',
    },
  };

  const startWizardAs = (user: unknown) => {
    cy.login();
    // Disable showProfilePicture so the wizard is just [Step 1, Step 2] (or [Step 2]
    // for OAuth) — no picture-upload step to click through.
    cy.intercept('GET', '/api/feature-flags', {
      body: {
        showSignup: true,
        showProfilePicture: false,
        showStripe: true,
      },
    });
    // Override the authenticated /me with a first-access user so the layout opens
    // the wizard modal (later intercept wins over stubBaseline's fixture).
    cy.intercept('GET', '/api/users/me', { body: user }).as('me');
    cy.visit('/dashboard');
  };

  it('opens for an email-registered first-access user on Step 1', () => {
    startWizardAs(firstAccessEmailUser);
    cy.contains(en.onboarding.wizard.step1.title).should('be.visible');
    // Regression: the consent-version modal must not stack over the wizard
    // during first-access onboarding (user has no consent_version yet).
    cy.get('#consent-modal-title').should('not.exist');
  });

  it('advances Step 1 → Step 2 and redeems a valid invite code', () => {
    cy.intercept('POST', '/api/user/complete-setup', {
      statusCode: 200,
      body: { success: true },
    }).as('completeSetup');
    cy.intercept('POST', '/api/invitation/redeem', {
      statusCode: 200,
      body: { success: true },
    }).as('redeem');
    startWizardAs(firstAccessEmailUser);

    // Step 1 — name + password
    cy.contains(en.onboarding.wizard.step1.title).should('be.visible');
    cy.get('#wizard-first-name').type('Giulia');
    cy.get('#wizard-last-name').type('Neri');
    cy.get('#wizard-password').type('Password123!');
    cy.contains('button', en.wizard.next).click();

    // Step 2 — invite code; entering all 6 digits fires redeem via @complete
    cy.contains(en.onboarding.wizard.step2.title).should('be.visible');
    typeInviteCode('123456');
    cy.wait('@redeem').its('request.body').should('exist');

    // Finish the wizard → password/name persisted via complete-setup
    cy.contains('button', en.wizard.finish).click();
    cy.wait('@completeSetup').its('request.body').should('include', {
      firstName: 'Giulia',
      lastName: 'Neri',
    });
  });

  it('lets the user skip the invite code and still complete setup', () => {
    cy.intercept('POST', '/api/user/complete-setup', {
      statusCode: 200,
      body: { success: true },
    }).as('completeSetup');
    const redeem = cy.spy().as('redeemSpy');
    cy.intercept('POST', '/api/invitation/redeem', (req) => {
      redeem();
      req.reply({ statusCode: 200, body: { success: true } });
    });
    startWizardAs(firstAccessEmailUser);

    cy.get('#wizard-first-name').type('Giulia');
    cy.get('#wizard-last-name').type('Neri');
    cy.get('#wizard-password').type('Password123!');
    cy.contains('button', en.wizard.next).click();

    // Step 2 — leave the code empty and finish
    cy.contains(en.onboarding.wizard.step2.title).should('be.visible');
    cy.contains('button', en.wizard.finish).click();

    cy.wait('@completeSetup');
    // No code entered → redeem must never be called.
    cy.get('@redeemSpy').should('not.have.been.called');
  });

  it('skips Step 1 for an OAuth user and opens directly on the invite step', () => {
    startWizardAs(firstAccessOAuthUser);
    cy.contains(en.onboarding.wizard.step2.title).should('be.visible');
    cy.contains(en.onboarding.wizard.step1.title).should('not.exist');
  });
});
