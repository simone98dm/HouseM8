import { describe, it, expect } from 'vitest';

import { settleDebts, type Transfer } from '../settlement';
import { toCents } from '../money';

/** Applies every transfer to a copy of `balances` and returns the result. */
const applyTransfers = (
  balances: Record<string, number>,
  transfers: Transfer[],
): Record<string, number> => {
  const result = { ...balances };
  for (const transfer of transfers) {
    const amountCents = toCents(transfer.amount);
    // paying down a debt moves the debtor's balance toward zero (up);
    // receiving payment moves the creditor's balance toward zero (down)
    result[transfer.from] = (result[transfer.from] ?? 0) + amountCents;
    result[transfer.to] = (result[transfer.to] ?? 0) - amountCents;
  }
  return result;
};

const nonZeroCount = (balances: Record<string, number>) =>
  Object.values(balances).filter((cents) => cents !== 0).length;

describe('settleDebts', () => {
  it('produces zero transfers when everyone is already settled', () => {
    expect(settleDebts({ alice: 0, bob: 0, carol: 0 })).toEqual([]);
  });

  it('produces one transfer for a simple two-person debt', () => {
    const transfers = settleDebts({ alice: -500, bob: 500 });
    expect(transfers).toEqual([{ from: 'alice', to: 'bob', amount: 5 }]);
  });

  it('finds the fewest transfers where the old greedy plan needed more', () => {
    // {a,b,e} and {c,d,f} each sum to zero on their own, so 4 transfers is
    // optimal; the previous pairing+greedy algorithm produced 5.
    const balances = { a: -70, b: -30, c: -45, d: -55, e: 100, f: 100 };

    const transfers = settleDebts(balances);

    expect(transfers).toEqual([
      { from: 'a', to: 'e', amount: 0.7 },
      { from: 'b', to: 'e', amount: 0.3 },
      { from: 'c', to: 'f', amount: 0.45 },
      { from: 'd', to: 'f', amount: 0.55 },
    ]);
    expect(applyTransfers(balances, transfers)).toEqual({
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      f: 0,
    });
  });

  it('keeps an exactly matching debtor/creditor pair as a single transfer', () => {
    const balances = { d1: -100, d2: -30, c1: 90, c2: 30, c3: 10 };
    const transfers = settleDebts(balances);

    expect(transfers).toHaveLength(3);
    expect(transfers).toContainEqual({ from: 'd2', to: 'c2', amount: 0.3 });
  });

  it('is deterministic: same balances, same plan regardless of key order', () => {
    const forward = settleDebts({ a: -50, b: -30, c: 45, d: 35 });
    const reversed = settleDebts({ d: 35, c: 45, b: -30, a: -50 });
    expect(reversed).toEqual(forward);
    expect(forward).toEqual([
      { from: 'a', to: 'c', amount: 0.45 },
      { from: 'a', to: 'd', amount: 0.05 },
      { from: 'b', to: 'd', amount: 0.3 },
    ]);
  });

  it('settles every cent when no debtor magnitude equals a creditor magnitude', () => {
    const balances = { a: -50, b: -30, c: 45, d: 35 };
    const transfers = settleDebts(balances);

    expect(transfers.length).toBeGreaterThan(0);
    const final = applyTransfers(balances, transfers);
    for (const cents of Object.values(final)) {
      expect(cents).toBe(0);
    }
  });

  it('never exceeds n-1 transfers for n people with a nonzero balance', () => {
    const balances = {
      a: -1000,
      b: -250,
      c: -75,
      d: 600,
      e: 400,
      f: 225,
      g: 100,
    };
    const transfers = settleDebts(balances);
    const n = nonZeroCount(balances);
    expect(transfers.length).toBeLessThanOrEqual(n - 1);
  });

  it('clears every balance to exactly zero when transfers are applied', () => {
    const balances = { a: -733, b: -217, c: 500, d: 450 };
    const transfers = settleDebts(balances);
    const final = applyTransfers(balances, transfers);
    for (const cents of Object.values(final)) {
      expect(cents).toBe(0);
    }
  });

  it('throws when total debts do not equal total credits', () => {
    expect(() => settleDebts({ alice: -100, bob: 50 })).toThrow(
      /don't reconcile/,
    );
  });

  it('throws on non-integer cent balances', () => {
    expect(() => settleDebts({ alice: -100.5, bob: 100.5 })).toThrow(
      /Invalid balance/,
    );
  });

  it.each([
    {
      name: 'mixed 7-person',
      oldCount: 5,
      balances: { a: -1000, b: -250, c: -75, d: 600, e: 400, f: 225, g: 100 },
    },
    {
      name: 'odd cents',
      oldCount: 3,
      balances: { a: -733, b: -217, c: 500, d: 450 },
    },
  ])(
    'never uses more transfers than the old greedy plan ($name)',
    ({ balances, oldCount }) => {
      expect(
        settleDebts(balances as Record<string, number>).length,
      ).toBeLessThanOrEqual(oldCount);
    },
  );

  describe('property-style: randomized-looking zero-sum balance sets always fully settle', () => {
    // fixed fixtures instead of unseeded Math.random() so this never flakes
    // in CI; each set sums to exactly zero, N ranges 3-8 people
    const fixtures: Record<string, number>[] = [
      { p1: -300, p2: -200, p3: 500 },
      { p1: -450, p2: 150, p3: 150, p4: 150 },
      { p1: -1000, p2: -500, p3: 300, p4: 700, p5: 500 },
      { p1: -120, p2: -80, p3: -40, p4: 90, p5: 90, p6: 60 },
      { p1: -999, p2: -1, p3: 500, p4: 500 },
      { p1: -333, p2: -333, p3: -334, p4: 1000 },
      {
        p1: -700,
        p2: -300,
        p3: -50,
        p4: 200,
        p5: 250,
        p6: 300,
        p7: 300,
      },
      {
        p1: -1500,
        p2: -750,
        p3: -250,
        p4: -100,
        p5: 900,
        p6: 800,
        p7: 600,
        p8: 300,
      },
    ];

    it.each(fixtures.map((balances, index) => ({ balances, index })))(
      'settles fixture #$index fully with at most n-1 transfers',
      ({ balances }) => {
        const transfers = settleDebts(balances);
        const n = nonZeroCount(balances);

        expect(transfers.length).toBeLessThanOrEqual(Math.max(n - 1, 0));

        const final = applyTransfers(balances, transfers);
        for (const cents of Object.values(final)) {
          expect(cents).toBe(0);
        }
      },
    );
  });
});
