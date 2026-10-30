import en from '../support/i18n';

// Reports have owner/user duality: the seeded user owns house-0001, so by default
// loadReports() fetches the owner list and the owner-only "Mark as Solved" action
// is available. The create flow is user-only (canCreateReport = house && !owner),
// so that test overrides the current house to one the user does not own.
// ponytail: report delete and image upload have no first-class list UI here and
// are covered at the API/unit layer.
describe('Reports', () => {
  beforeEach(() => {
    cy.login();
    cy.intercept('GET', '/api/reports/owner*', { fixture: 'reports.json' }).as(
      'ownerReports',
    );
    cy.intercept('GET', '/api/reports/user*', { fixture: 'reports.json' }).as(
      'userReports',
    );
  });

  it('lists reports with their descriptions', () => {
    cy.visit('/reports');
    cy.wait('@ownerReports');
    cy.contains('Leaking tap in the bathroom').should('be.visible');
    cy.contains('Broken heater in the living room').should('be.visible');
  });

  it('marks a report as solved (owner action)', () => {
    cy.intercept('PATCH', '/api/reports/rep-0001/solved', {
      statusCode: 200,
      body: { data: { id: 'rep-0001', solved_at: '2026-06-27T00:00:00.000Z' } },
    }).as('solved');
    cy.visit('/reports');
    cy.wait('@ownerReports');
    // Only the unsolved report (rep-0001) shows the owner Mark-as-Solved button.
    cy.contains('button:visible', en.reports.markAsSolved).click();
    cy.wait('@solved');
  });

  it('creates a report with the right payload (user action)', () => {
    // Make the current user a non-owner so the create action is available.
    // A query-object matcher doesn't win over the baseline glob handler, so
    // re-register the same branching handler with a non-owner current house.
    cy.intercept('GET', '/api/houses*', (req) => {
      if (req.query.current === 'true') {
        req.reply({
          body: {
            data: {
              id: 'house-0001',
              name: 'Via Roma 12',
              currency: 'EUR',
              owner_id: '22222222-2222-2222-2222-222222222222',
              project_id: 'proj-0001',
            },
          },
        });
      } else {
        req.reply({ fixture: 'houses.json' });
      }
    });
    cy.intercept('POST', '/api/reports', {
      statusCode: 201,
      body: {
        data: {
          id: 'rep-0009',
          description: 'The kitchen sink is clogged badly',
        },
      },
    }).as('create');
    cy.visit('/reports');
    cy.wait('@userReports');
    cy.contains('button:visible', en.reports.newReport).click();
    cy.get('#report-description').type('The kitchen sink is clogged badly');
    cy.contains('button', en.reports.form.submit).click();
    cy.wait('@create')
      .its('request.body')
      .should('include', { description: 'The kitchen sink is clogged badly' });
  });
});
