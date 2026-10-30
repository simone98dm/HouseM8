import { describe, it, expect } from 'vitest';
import { staleUnsettledCount, yourMonth } from '../homeFigures';

const NOW = new Date(2026, 9, 28, 12); // 28 Oct 2026, local

const bill = (monthly_cost: number, active = true) => ({
  active,
  monthly_cost,
});

const expense = (
  created_at: Date,
  shares: { user_id: string; amount_due: number; is_paid?: boolean }[],
  created_by = 'u-2',
) => ({
  created_by,
  created_at: created_at.toISOString(),
  expense_shares: shares.map((s) => ({ is_paid: false, ...s })),
});

describe('yourMonth', () => {
  it('adds your share of the bills to your share of this month expenses', () => {
    const result = yourMonth({
      bills: [bill(60), bill(40.5)],
      expenses: [
        expense(new Date(2026, 9, 3), [
          { user_id: 'u-1', amount_due: 10.99 },
          { user_id: 'u-2', amount_due: 10.99 },
        ]),
        expense(new Date(2026, 9, 20), [{ user_id: 'u-1', amount_due: 4 }]),
      ],
      userId: 'u-1',
      memberCount: 3,
      now: NOW,
    });
    expect(result).toEqual({ bills: 33.5, shared: 14.99, total: 48.49 });
  });

  it('ignores expenses from other months and other people', () => {
    const result = yourMonth({
      bills: [],
      expenses: [
        expense(new Date(2026, 8, 30, 23), [{ user_id: 'u-1', amount_due: 9 }]),
        expense(new Date(2026, 10, 1), [{ user_id: 'u-1', amount_due: 9 }]),
        expense(new Date(2026, 9, 5), [{ user_id: 'u-2', amount_due: 9 }]),
      ],
      userId: 'u-1',
      memberCount: 2,
      now: NOW,
    });
    expect(result).toEqual({ bills: 0, shared: 0, total: 0 });
  });

  it('ignores inactive bills and does not drift on cents', () => {
    const result = yourMonth({
      bills: [bill(0.1), bill(0.2), bill(999, false)],
      expenses: [],
      userId: 'u-1',
      memberCount: 1,
      now: NOW,
    });
    expect(result.total).toBe(0.3);
  });
});

describe('staleUnsettledCount', () => {
  const daysAgo = (n: number) => new Date(2026, 9, 28 - n, 12);

  it('counts expenses with an unpaid housemate share older than 14 days', () => {
    const expenses = [
      expense(daysAgo(20), [{ user_id: 'u-1', amount_due: 5 }]),
      expense(daysAgo(15), [{ user_id: 'u-1', amount_due: 5 }]),
      expense(daysAgo(3), [{ user_id: 'u-1', amount_due: 5 }]),
      expense(daysAgo(20), [{ user_id: 'u-1', amount_due: 5, is_paid: true }]),
      // The payer's own share is never "owed".
      expense(daysAgo(20), [{ user_id: 'u-2', amount_due: 5 }], 'u-2'),
    ];
    expect(staleUnsettledCount(expenses, NOW)).toBe(2);
  });
});
