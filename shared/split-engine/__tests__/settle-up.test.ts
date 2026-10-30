import { describe, expect, it } from 'vitest';
import { GroupValidationError } from '../logic/group-validator';
import { suggestPayments } from '../logic/settle-up';
import { splitEqually } from '../utils/portions';
import { expense, makeGroup } from '../test-utils/helpers';

describe('suggestPayments', () => {
  it('settles a shared trip with the fewest payments', () => {
    const people = ['alice', 'bob', 'carol', 'dave'];
    const group = makeGroup(people, [
      expense('alice', 400, splitEqually(people)),
      expense('bob', 80, splitEqually(['alice', 'bob'])),
      expense('carol', 40, splitEqually(['carol', 'dave'])),
    ]);

    const payments = suggestPayments(group);

    // Balances: alice +260, bob -60, carol -80, dave -120
    expect(payments).toEqual([
      { from: 'bob', to: 'alice', amount: 60, currencyCode: 'EUR' },
      { from: 'carol', to: 'alice', amount: 80, currencyCode: 'EUR' },
      { from: 'dave', to: 'alice', amount: 120, currencyCode: 'EUR' },
    ]);
  });

  it('returns nothing once all debts were paid back', () => {
    const group = makeGroup(['alice', 'bob'], [
      expense('alice', 50, splitEqually(['alice', 'bob'])),
      { kind: 'payment', currencyCode: 'EUR', primaryPayer: 'bob', items: [{ amount: 25, beneficiaries: { alice: 1 } }] },
    ]);

    expect(suggestPayments(group)).toEqual([]);
  });

  it('drops payments that round to zero in the group currency', () => {
    const group = makeGroup(['alice', 'bob'], [expense('alice', 0.004, { bob: 1 })]);

    expect(suggestPayments(group, { fractionDigits: 2 })).toEqual([]);
    expect(suggestPayments(group, { fractionDigits: 3 })).toHaveLength(1);
  });

  it('expresses payments in the group default currency', () => {
    const group = makeGroup(['alice', 'bob'], [expense('alice', 100, { bob: 1 }, { currencyCode: 'USD' })], {
      currencyRates: { EUR: 1.25, USD: 1 },
    });

    const [payment] = suggestPayments(group);

    expect(payment?.currencyCode).toBe('EUR');
    expect(payment?.amount).toBeCloseTo(80);
  });

  it('rejects invalid groups before calculating', () => {
    const group = makeGroup(['alice'], [expense('alice', 10, { bob: 0.5 })]);

    expect(() => suggestPayments(group)).toThrow(GroupValidationError);
  });
});
