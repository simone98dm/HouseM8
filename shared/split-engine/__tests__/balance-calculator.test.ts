import { describe, expect, it } from 'vitest';
import { calculateBalances } from '../logic/balance-calculator';
import type { Entry } from '../types';
import { expense, makeGroup } from '../test-utils/helpers';

describe('calculateBalances', () => {
  it('gives everyone a zero balance when there are no entries', () => {
    expect(calculateBalances(makeGroup(['alice', 'bob'], []))).toEqual({ alice: 0, bob: 0 });
  });

  it('credits the payer and debits each beneficiary their fraction', () => {
    const group = makeGroup(['alice', 'bob', 'carol'], [expense('alice', 90, { alice: 1 / 3, bob: 1 / 3, carol: 1 / 3 })]);

    const balances = calculateBalances(group);

    expect(balances.alice).toBeCloseTo(60);
    expect(balances.bob).toBeCloseTo(-30);
    expect(balances.carol).toBeCloseTo(-30);
  });

  it('moves the secondary payers contribution away from the primary payer', () => {
    const group = makeGroup(['alice', 'bob'], [
      expense('alice', 100, { alice: 0.5, bob: 0.5 }, { secondaryPayers: { bob: 40 } }),
    ]);

    expect(calculateBalances(group)).toEqual({ alice: 10, bob: -10 });
  });

  it('treats a payment as money moved from sender to receiver', () => {
    const payment: Entry = { kind: 'payment', currencyCode: 'EUR', primaryPayer: 'bob', items: [{ amount: 25, beneficiaries: { alice: 1 } }] };
    const group = makeGroup(['alice', 'bob'], [expense('alice', 50, { alice: 0.5, bob: 0.5 }), payment]);

    expect(calculateBalances(group)).toEqual({ alice: 0, bob: 0 });
  });

  it('sums several items with different beneficiaries', () => {
    const entry: Entry = {
      kind: 'expense',
      currencyCode: 'EUR',
      primaryPayer: 'alice',
      items: [
        { title: 'Pizza', amount: 20, beneficiaries: { alice: 0.5, bob: 0.5 } },
        { title: 'Wine', amount: 30, beneficiaries: { bob: 1 } },
      ],
    };

    expect(calculateBalances(makeGroup(['alice', 'bob'], [entry]))).toEqual({ alice: 40, bob: -40 });
  });

  it('converts foreign-currency entries into the group currency', () => {
    const group = makeGroup(['alice', 'bob'], [expense('alice', 100, { bob: 1 }, { currencyCode: 'USD' })], {
      currencyRates: { EUR: 1.25, USD: 1 },
    });

    const balances = calculateBalances(group);

    expect(balances.alice).toBeCloseTo(80);
    expect(balances.bob).toBeCloseTo(-80);
  });

  it('assumes a 1:1 rate for currencies missing from the table', () => {
    const group = makeGroup(['alice', 'bob'], [expense('alice', 10, { bob: 1 }, { currencyCode: 'XYZ' })]);

    expect(calculateBalances(group)).toEqual({ alice: 10, bob: -10 });
  });

  it('includes people who appear only in entries', () => {
    const group = makeGroup([], [expense('alice', 10, { bob: 1 })]);

    expect(calculateBalances(group)).toEqual({ alice: 10, bob: -10 });
  });

  it('always sums to zero', () => {
    const group = makeGroup(['a', 'b', 'c'], [
      expense('a', 33.33, { a: 0.2, b: 0.3, c: 0.5 }),
      expense('b', 12.7, { a: 0.5, c: 0.5 }, { secondaryPayers: { c: 2.5 } }),
    ]);

    const total = Object.values(calculateBalances(group)).reduce((sum, value) => sum + value, 0);

    expect(total).toBeCloseTo(0, 9);
  });
});
