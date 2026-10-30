import en from '../support/i18n';

const BILL_0001 = {
  data: {
    id: 'bill-0001',
    house_id: 'house-0001',
    created_by: '11111111-1111-1111-1111-111111111111',
    description: 'Electricity',
    monthly_cost: 60.0,
    currency: 'EUR',
    next_due_date: '2026-07-01',
    payment_period: 1,
    active: true,
  },
};

// ponytail: there is no advance ("mark paid & advance") UI trigger on the bill
// pages, so that endpoint is covered only at the unit/API layer.
describe('Bills', () => {
  beforeEach(() => {
    cy.login();
    cy.intercept('GET', '/api/bills*', { fixture: 'bills.json' }).as('bills');
  });

  it('lists bills with exact monthly amounts', () => {
    cy.visit('/bills');
    cy.wait('@bills');
    cy.contains('Electricity').should('be.visible');
    cy.contains('Water').should('be.visible');
    cy.contains('€ 60.00').should('be.visible');
    cy.contains('€ 30.00').should('be.visible');
  });

  it('creates a bill with the right payload', () => {
    cy.intercept('POST', '/api/bills', {
      statusCode: 201,
      fixture: 'bill.json',
    }).as('create');
    cy.visit('/bills');
    cy.wait('@bills');
    cy.contains('button', en.bills.addBill).click();
    cy.get('#description').type('Gas');
    cy.get('#monthly_cost').type('40');
    cy.get('#next_due_date').type('2026-08-01');
    cy.get('[role="dialog"] button[type="submit"]').click();
    cy.wait('@create')
      .its('request.body')
      .should((b) => {
        expect(b.description).to.eq('Gas');
        expect(Number(b.monthly_cost)).to.eq(40);
      });
  });

  it('views a bill detail with its amount', () => {
    cy.intercept('GET', '/api/bills/bill-0001', { body: BILL_0001 }).as(
      'detail',
    );
    cy.visit('/bills/bill-0001');
    cy.wait('@detail');
    cy.contains('Electricity').should('be.visible');
    cy.contains('€ 60.00').should('be.visible');
  });

  it('deletes a bill from the detail page', () => {
    cy.intercept('GET', '/api/bills/bill-0001', { body: BILL_0001 });
    cy.intercept('DELETE', '/api/bills/bill-0001', {
      statusCode: 200,
      body: { data: { success: true } },
    }).as('del');
    cy.visit('/bills/bill-0001');
    // Open the delete confirmation, then confirm.
    cy.get('[aria-label="Delete bill"]').filter(':visible').first().click();
    cy.get('[role="dialog"]').find('[aria-label="Delete bill"]').click();
    cy.wait('@del');
    cy.location('pathname').should('eq', '/bills');
  });

  it('surfaces an error when the list request fails', () => {
    cy.intercept('GET', '/api/bills*', { statusCode: 500, body: {} }).as('err');
    cy.visit('/bills');
    cy.wait('@err');
    cy.contains(en.errors.serverError).should('be.visible');
  });
});
