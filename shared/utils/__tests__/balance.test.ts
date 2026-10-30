import { describe, it, expect } from 'vitest';

import {
  calculateBalances,
  calculateBalancesInCents,
  sharesForExpense,
  type BalanceExpenseInput,
  type BalancePaymentInput,
} from '../balance';
import { settleDebts } from '../settlement';

const share = (
  userId: string,
  amountDueCents: number,
  isPaid = false,
): BalanceExpenseInput['shares'][number] => ({
  userId,
  amountDueCents,
  isPaid,
});

const expense = (
  overrides: Partial<BalanceExpenseInput> & Pick<BalanceExpenseInput, 'shares'>,
): BalanceExpenseInput => ({
  id: 'e-1',
  createdBy: 'payer',
  totalAmountCents: overrides.shares.reduce(
    (sum, s) => sum + s.amountDueCents,
    0,
  ),
  ...overrides,
});

const sumBalances = (balances: Record<string, number>) =>
  Object.values(balances).reduce((sum, cents) => sum + cents, 0);

describe('sharesForExpense', () => {
  it('splits euros into integer cent shares', () => {
    expect(sharesForExpense(9, 3)).toEqual([300, 300, 300]);
  });

  it('throws when there are zero participants', () => {
    expect(() => sharesForExpense(10, 0)).toThrow(/at least one participant/);
  });

  it('throws on a negative participant count', () => {
    expect(() => sharesForExpense(10, -1)).toThrow(/at least one participant/);
  });
});

describe('calculateBalancesInCents', () => {
  it('always sums to exactly zero', () => {
    const expenses = [
      expense({
        id: 'e-1',
        createdBy: 'alice',
        shares: [share('bob', 300), share('carol', 300)],
      }),
      expense({
        id: 'e-2',
        createdBy: 'bob',
        shares: [share('alice', 150), share('carol', 150)],
      }),
    ];

    const balances = calculateBalancesInCents(expenses, [
      'alice',
      'bob',
      'carol',
    ]);
    expect(sumBalances(balances)).toBe(0);
  });

  it('handles a payer who is not a participant in their own expense', () => {
    // alice pays, only bob and carol owe a share
    const expenses = [
      expense({
        createdBy: 'alice',
        shares: [share('bob', 500), share('carol', 500)],
      }),
    ];

    const balances = calculateBalancesInCents(expenses, [
      'alice',
      'bob',
      'carol',
    ]);

    expect(balances.alice).toBe(1000);
    expect(balances.bob).toBe(-500);
    expect(balances.carol).toBe(-500);
    expect(sumBalances(balances)).toBe(0);
  });

  it('skips the payer own share when they are also a participant', () => {
    // split evenly three ways including the payer; payer's own share must
    // not be counted as a debt to themselves
    const expenses = [
      expense({
        createdBy: 'alice',
        shares: [share('alice', 333), share('bob', 333), share('carol', 334)],
      }),
    ];

    const balances = calculateBalancesInCents(expenses, [
      'alice',
      'bob',
      'carol',
    ]);

    expect(balances.alice).toBe(333 + 334);
    expect(balances.bob).toBe(-333);
    expect(balances.carol).toBe(-334);
    expect(sumBalances(balances)).toBe(0);
  });

  it('handles a participant who is not the payer', () => {
    const expenses = [
      expense({ createdBy: 'alice', shares: [share('bob', 200)] }),
    ];
    const balances = calculateBalancesInCents(expenses, ['alice', 'bob']);
    expect(balances.bob).toBe(-200);
    expect(balances.alice).toBe(200);
  });

  it('a payment cancels the matching paid share (paid flag itself is ignored)', () => {
    const expenses = [
      expense({
        createdBy: 'alice',
        shares: [share('bob', 500, true), share('carol', 500, false)],
      }),
    ];

    const balances = calculateBalancesInCents(
      expenses,
      ['alice', 'bob', 'carol'],
      [{ fromUserId: 'bob', toUserId: 'alice', amountCents: 500 }],
    );

    // bob already paid: no debt entry for him, alice only owed by carol
    expect(balances.bob).toBe(0);
    expect(balances.carol).toBe(-500);
    expect(balances.alice).toBe(500);
  });

  it('still includes a person who has left the house but appears in past expenses', () => {
    // "departed" is not in the active roster anymore, but they still owe
    // money from a past expense and must not silently vanish
    const expenses = [
      expense({ createdBy: 'alice', shares: [share('departed', 400)] }),
    ];

    const balances = calculateBalancesInCents(expenses, ['alice']);

    expect(balances.departed).toBe(-400);
    expect(balances.alice).toBe(400);
    expect(sumBalances(balances)).toBe(0);
  });

  it('returns a zeroed result for the roster and does not throw on an empty expense list', () => {
    const balances = calculateBalancesInCents([], ['alice', 'bob']);
    expect(balances).toEqual({ alice: 0, bob: 0 });
  });

  it('is a no-op (does not throw) for an expense with zero shares', () => {
    // calculateBalancesInCents itself does not validate share cardinality —
    // an expense with an empty shares array simply contributes nothing.
    // Cardinality validation lives in sharesForExpense (see above).
    const expenses = [expense({ createdBy: 'alice', shares: [] })];
    const balances = calculateBalancesInCents(expenses, ['alice']);
    expect(balances).toEqual({ alice: 0 });
  });
});

describe('calculateBalances', () => {
  it('converts the cent balances to major currency units', () => {
    const expenses = [
      expense({ createdBy: 'alice', shares: [share('bob', 1050)] }),
    ];
    const balances = calculateBalances(expenses, ['alice', 'bob']);
    expect(balances.alice).toBe(10.5);
    expect(balances.bob).toBe(-10.5);
  });
});

describe('calculateBalancesInCents regression vs the pre-engine algorithm', () => {
  /** The original hand-rolled pass, kept as an oracle for the engine-backed one. */
  const legacyBalances = (
    expenses: BalanceExpenseInput[],
    roster: string[],
  ): Record<string, number> => {
    const balances: Record<string, number> = {};
    for (const userId of roster) balances[userId] = 0;
    for (const e of expenses) {
      for (const s of e.shares) {
        if (s.isPaid || s.userId === e.createdBy) continue;
        balances[s.userId] = (balances[s.userId] ?? 0) - s.amountDueCents;
        balances[e.createdBy] = (balances[e.createdBy] ?? 0) + s.amountDueCents;
      }
    }
    return balances;
  };

  /** What the migration backfill does: one 'share' payment per paid, non-own share. */
  const backfill = (expenses: BalanceExpenseInput[]): BalancePaymentInput[] =>
    expenses.flatMap((e) =>
      e.shares
        .filter(
          (s) => s.isPaid && s.userId !== e.createdBy && s.amountDueCents > 0,
        )
        .map((s) => ({
          fromUserId: s.userId,
          toUserId: e.createdBy,
          amountCents: s.amountDueCents,
        })),
    );

  // mulberry32: deterministic so CI never flakes
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('returns identical balances on 300 seeded random ledgers', () => {
    const random = seeded(7);
    for (let i = 0; i < 300; i++) {
      const users = Array.from(
        { length: 2 + Math.floor(random() * 7) },
        (_, k) => `u${k}`,
      );
      const expenses = Array.from(
        { length: Math.floor(random() * 8) },
        (_, k) =>
          expense({
            id: `e${k}`,
            createdBy: users[Math.floor(random() * users.length)]!,
            shares: users
              .filter(() => random() < 0.7)
              .map((u) =>
                share(u, Math.floor(random() * 5000), random() < 0.2),
              ),
          }),
      );
      const roster = users.filter(() => random() < 0.8);

      // a fully-paid debtor now shows an explicit 0 where the old pass omitted them
      const nonZero = (b: Record<string, number>) =>
        Object.fromEntries(Object.entries(b).filter(([, v]) => v !== 0));
      expect(
        nonZero(calculateBalancesInCents(expenses, roster, backfill(expenses))),
      ).toEqual(nonZero(legacyBalances(expenses, roster)));
    }
  });

  it('skips expenses whose only shares are paid, zero or the payer own', () => {
    const expenses = [
      expense({ createdBy: 'alice', shares: [share('bob', 100, true)] }),
      expense({ createdBy: 'alice', shares: [share('carol', 0)] }),
      expense({ createdBy: 'alice', shares: [share('alice', 100)] }),
    ];
    expect(
      calculateBalancesInCents(expenses, ['alice'], backfill(expenses)),
    ).toEqual({ alice: 0, bob: 0 });
  });

  it('rejects negative share amounts instead of silently accepting them', () => {
    const expenses = [
      expense({ createdBy: 'alice', shares: [share('bob', -100)] }),
    ];
    expect(() => calculateBalancesInCents(expenses, ['alice', 'bob'])).toThrow(
      /non-negative/,
    );
  });
});

describe('netted settle-up payments', () => {
  it('a netted transfer (anna -> marco via luca) settles everyone to zero', () => {
    const expenses = [
      expense({ id: 'e1', createdBy: 'luca', shares: [share('anna', 1000)] }),
      expense({ id: 'e2', createdBy: 'marco', shares: [share('luca', 1000)] }),
    ];
    const roster = ['anna', 'luca', 'marco'];
    const plan = settleDebts(calculateBalancesInCents(expenses, roster));
    expect(plan).toEqual([{ from: 'anna', to: 'marco', amount: 10 }]);

    const after = calculateBalancesInCents(expenses, roster, [
      { fromUserId: 'anna', toUserId: 'marco', amountCents: 1000 },
    ]);
    expect(after).toEqual({ anna: 0, luca: 0, marco: 0 });
  });
});
