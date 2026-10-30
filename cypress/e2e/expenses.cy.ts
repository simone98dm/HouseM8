import en from '../support/i18n';
import { assertExpenseFixtureTiesOut } from '../support/fixtureChecks';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const expensesFixture = require('../fixtures/expenses.json');

// The expense list renders both a mobile (md:hidden) and a desktop (hidden md:flex)
// layout, so each value exists twice in the DOM. We assert the visible (desktop)
// copy via the :visible selector. Switches/overlay buttons are force-clicked
// because they sit under pointer-events-none content layers.
describe('Expenses', () => {
  beforeEach(() => {
    cy.login();
    cy.intercept('GET', '/api/expenses*', { fixture: 'expenses.json' }).as(
      'expenses',
    );
  });

  it('fixtures tie out: each total equals sum of shares', () => {
    assertExpenseFixtureTiesOut(expensesFixture.data);
  });

  it('lists expenses with exact formatted EUR amounts', () => {
    cy.visit('/expenses');
    cy.wait('@expenses');
    cy.contains(':visible', 'Groceries');
    cy.contains(':visible', 'Internet');
    cy.contains(':visible', 'Dinner');
    // Value-correctness: UiCurrency renders "<symbol> <amount>" (e.g. "€ 90.00").
    cy.contains(':visible', '€ 90.00');
    cy.contains(':visible', '€ 45.00');
    cy.contains(':visible', '€ 60.00');
  });

  it('creates an expense and sends the correct payload', () => {
    cy.intercept('POST', '/api/expenses', {
      statusCode: 201,
      fixture: 'expense.json',
    }).as('create');
    cy.visit('/expenses');
    cy.wait('@expenses');
    cy.contains('button', en.expenses.addExpense).click();
    cy.get(
      `input[placeholder="${en.expenses.form.descriptionPlaceholder}"]`,
    ).type('Cinema night');
    cy.get(`input[placeholder="${en.expenses.form.amountPlaceholder}"]`).type(
      '24',
    );
    // The current user's split switch is pre-selected, so the form is already
    // valid; description + amount are all that's needed to enable submit.
    cy.contains('button', en.expenses.form.createExpense).click();
    cy.wait('@create')
      .its('request.body')
      .should((body) => {
        expect(body.description).to.eq('Cinema night');
        expect(Number(body.total_amount)).to.eq(24);
      });
  });

  it('deletes an expense from the detail modal', () => {
    cy.intercept('DELETE', '/api/expenses/exp-0001', {
      statusCode: 200,
      body: { data: { success: true } },
    }).as('del');
    cy.visit('/expenses');
    cy.wait('@expenses');
    // Open the expense detail (creator-only delete lives in the view modal).
    cy.get('[aria-label="View details for Groceries"]')
      .filter(':visible')
      .first()
      .click({ force: true });
    cy.contains('button', en.expenses.viewModal.deleteExpense).click();
    cy.wait('@del');
  });

  it('surfaces an error when the list request fails', () => {
    cy.intercept('GET', '/api/expenses*', {
      statusCode: 500,
      body: { message: 'boom' },
    }).as('expensesErr');
    cy.visit('/expenses');
    cy.wait('@expensesErr');
    cy.contains(en.errors.generic).should('be.visible');
  });
});
