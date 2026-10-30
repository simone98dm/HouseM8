import { describe, expect, it } from 'vitest';
import { minimizePayments } from '../logic/payments-minimizer';
import { applyTransfers, optimalPaymentCount, seededRandom } from '../test-utils/helpers';

describe('minimizePayments', () => {
  it('returns no payments when nobody owes anything', () => {
    expect(minimizePayments({})).toEqual([]);
    expect(minimizePayments({ alice: 0, bob: 0 })).toEqual([]);
  });

  it('ignores balances below the settled epsilon', () => {
    expect(minimizePayments({ alice: 0.0005, bob: -0.0005 })).toEqual([]);
  });

  it('makes the debtor pay the creditor', () => {
    expect(minimizePayments({ alice: 30, bob: -30 })).toEqual([{ from: 'bob', to: 'alice', amount: 30 }]);
  });

  it('skips intermediaries with a zero balance', () => {
    expect(minimizePayments({ alice: -10, bob: 0, carol: 10 })).toEqual([{ from: 'alice', to: 'carol', amount: 10 }]);
  });

  it('pairs exact matches instead of the naive 3-payment greedy plan', () => {
    const balances = { a: -4, b: -6, c: 6, d: 4 };

    const payments = minimizePayments(balances);

    expect(payments).toHaveLength(2);
    expect(payments).toEqual(
      expect.arrayContaining([
        { from: 'a', to: 'd', amount: 4 },
        { from: 'b', to: 'c', amount: 6 },
      ]),
    );
  });

  it('splits one debt across several creditors', () => {
    const balances = { alice: 20, bob: 10, carol: -30 };

    const payments = minimizePayments(balances);

    expect(payments).toEqual([
      { from: 'carol', to: 'alice', amount: 20 },
      { from: 'carol', to: 'bob', amount: 10 },
    ]);
  });

  it('is deterministic regardless of key order', () => {
    const forward = minimizePayments({ a: 5, b: 7, c: -3, d: -9 });
    const backward = minimizePayments({ d: -9, c: -3, b: 7, a: 5 });
    expect(backward).toEqual(forward);
  });

  it('matches the brute-force optimum and settles every random group', () => {
    const random = seededRandom(42);
    for (let run = 0; run < 300; run++) {
      const size = 2 + Math.floor(random() * 6);
      const cents = Array.from({ length: size - 1 }, () => Math.round((random() - 0.5) * 20) * 500);
      cents.push(-cents.reduce((sum, value) => sum + value, 0));
      const balances = Object.fromEntries(cents.map((value, i) => [`p${i}`, value / 100]));

      const payments = minimizePayments(balances);

      expect(payments.length).toBe(optimalPaymentCount(cents));
      expect(payments.every((payment) => payment.amount > 0)).toBe(true);
      for (const remaining of Object.values(applyTransfers(balances, payments))) {
        expect(Math.abs(remaining)).toBeLessThan(1e-9);
      }
    }
  });

  it('still returns a complete plan when the iteration budget runs out', () => {
    const balances = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`p${String(i).padStart(2, '0')}`, i % 2 === 0 ? 10 + i : -(10 + i - 1)]),
    );

    const payments = minimizePayments(balances, { maxIterations: 50 });

    for (const remaining of Object.values(applyTransfers(balances, payments))) {
      expect(Math.abs(remaining)).toBeLessThan(1e-9);
    }
  });

  it('stops on the time budget using the injected clock', () => {
    let fakeTime = 0;
    const now = (): number => (fakeTime += 1_000);
    const balances = Object.fromEntries(
      Array.from({ length: 14 }, (_, i) => [`p${String(i).padStart(2, '0')}`, i < 7 ? i + 1 : -(i - 6)]),
    );

    const payments = minimizePayments(balances, { now });

    expect(payments.length).toBeLessThanOrEqual(13);
    for (const remaining of Object.values(applyTransfers(balances, payments))) {
      expect(Math.abs(remaining)).toBeLessThan(1e-9);
    }
  });
});
