import en from '../support/i18n';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const balanceFixture = require('../fixtures/balance.json');

const round2 = (n: number) => Math.round(n * 100) / 100;

// The balance page renders amounts via useCurrency.formatAmount, which for EUR
// suffixes the symbol (e.g. "15.00€") — distinct from the UiCurrency component.
describe('Balance', () => {
  beforeEach(() => cy.login());

  it('fixture integrity: user balances net to zero', () => {
    const net = round2(
      balanceFixture.data.user_balances.reduce(
        (a: number, b: { net_balance: number }) => a + b.net_balance,
        0,
      ),
    );
    expect(net).to.eq(0);
  });

  it('renders balances with exact formatted values', () => {
    cy.intercept('GET', '/api/balance/house-0001', {
      fixture: 'balance.json',
    }).as('balance');
    cy.visit('/balance');
    cy.wait('@balance');
    cy.contains('15.00€').should('be.visible');
    cy.contains('7.50€').should('be.visible');
  });

  it('shows the no-balance state when there is no data', () => {
    cy.intercept('GET', '/api/balance/house-0001', {
      statusCode: 200,
      body: { data: null },
    }).as('empty');
    cy.visit('/balance');
    cy.wait('@empty');
    cy.contains(en.balance.noBalanceData).should('be.visible');
  });
});
