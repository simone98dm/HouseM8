import en from '../support/i18n';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const houseFixture = require('../fixtures/house.json');

const round2 = (n: number) => Math.round(n * 100) / 100;

// ponytail: settle / invite / generate-invitation / join / leave live behind
// nested child-component triggers and external invitation tokens; covered at the
// API layer in unit tests. These e2e flows assert the high-value reachable
// surface — detail render, member integrity, and bulletin notes CRUD.
describe('Houses', () => {
  beforeEach(() => {
    cy.login();
  });

  it('fixture integrity: member balances net to zero', () => {
    const net = round2(
      houseFixture.data.members.reduce(
        (a: number, m: { balance: number }) => a + m.balance,
        0,
      ),
    );
    expect(net).to.eq(0);
  });

  it('shows the house detail with name and member names', () => {
    cy.intercept('GET', '/api/houses/house-0001', { fixture: 'house.json' }).as(
      'house',
    );
    cy.visit('/house/house-0001');
    cy.wait('@house');
    cy.contains('Via Roma 12').should('be.visible');
    cy.contains('Mario Rossi').should('be.visible');
    cy.contains('Luigi Verdi').should('be.visible');
    cy.contains('Anna Bianchi').should('be.visible');
  });

  it('lists bulletin notes on the dashboard', () => {
    cy.intercept('GET', '/api/bulletin-notes*', {
      fixture: 'bulletin-notes.json',
    }).as('notes');
    cy.visit('/dashboard');
    cy.wait('@notes');
    cy.contains('Buy milk').should('be.visible');
    cy.contains('Water the plants').should('be.visible');
  });

  it('creates a bulletin note with the right payload', () => {
    cy.intercept('GET', '/api/bulletin-notes*', {
      fixture: 'bulletin-notes.json',
    }).as('notes');
    cy.intercept('POST', '/api/bulletin-notes', {
      statusCode: 201,
      body: { id: 'note-0003', house_id: 'house-0001', message: 'Pay rent' },
    }).as('addNote');
    cy.visit('/dashboard');
    cy.wait('@notes');
    cy.contains('button', en.bulletin.newNote).click();
    cy.get('#bulletin-message').type('Pay rent');
    cy.contains('button', en.bulletin.modal.post).click();
    cy.wait('@addNote')
      .its('request.body')
      .should('include', { message: 'Pay rent' });
  });
});
