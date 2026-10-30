import { splitEvenly, toCents, toEuro } from './money';

import {
  calculateBalances as engineBalances,
  validateGroup,
  type Entry,
  type EntryItem,
  type Group,
} from '#shared/split-engine';

/**
 * Balances on top of the vendored `shared/split-engine`, fed house-m8-fe's
 * ledger model: every `expense_shares.amount_due` (frozen at creation time via
 * `sharesForExpense` below, paid or not) is a debt to the expense creator, and
 * every non-undone row of `settlements` is a payment that reduces it.
 * `is_paid` on a share is display-only and never read here.
 */

/** Every entry is in one currency (amounts sum 1:1); the code is just a label. */
const LEDGER_CURRENCY = 'EUR';

/** One participant's frozen share of an expense, in integer cents. */
export interface ExpenseShareInput {
  userId: string;
  amountDueCents: number;
  isPaid: boolean;
}

/** A recorded payment (non-undone `settlements` row), in integer cents. */
export interface BalancePaymentInput {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

/** The subset of an expense needed to compute balances, in integer cents. */
export interface BalanceExpenseInput {
  id: string;
  createdBy: string;
  totalAmountCents: number;
  shares: ExpenseShareInput[];
}

/**
 * Splits `totalAmount` (major currency unit, e.g. euros) into
 * `participantCount` integer-cent shares. `offset` rotates who absorbs the
 * leftover cent across different expenses — callers pass something that
 * varies per expense (e.g. its creation timestamp).
 */
export const sharesForExpense = (
  totalAmount: number,
  participantCount: number,
  offset = 0,
): number[] => {
  if (participantCount <= 0) {
    throw new Error(
      `Expense split requires at least one participant, got ${participantCount}`,
    );
  }
  return splitEvenly(toCents(totalAmount), participantCount, offset);
};

/**
 * Net position of every person in `roster`, in integer cents. Positive =
 * must receive, negative = must pay. The result always sums to exactly
 * zero.
 *
 * Computed by the vendored split-engine: each expense becomes one engine
 * entry paid by `createdBy`, with one item per share owed to someone other than
 * the payer (a payer's own share isn't a debt to themselves); each payment
 * becomes a `kind: 'payment'` entry (sender = primaryPayer, receiver = sole
 * beneficiary). Anyone appearing in a share or payment (e.g. a house member who
 * has since left) is included, so their balance settles instead of vanishing.
 *
 * Cents are fed to the engine as the unit with `fractionDigits: 0`, so every
 * operation is integer arithmetic (fraction 1 x integer amount) and exact.
 */
export const calculateBalancesInCents = (
  expenses: BalanceExpenseInput[],
  roster: string[],
  payments: BalancePaymentInput[] = [],
): Record<string, number> => {
  const people = new Set(roster);
  const entries: Entry[] = [];

  for (const expense of expenses) {
    const items: EntryItem[] = expense.shares
      .filter((share) => share.userId !== expense.createdBy)
      .map((share) => ({
        amount: share.amountDueCents,
        beneficiaries: { [share.userId]: 1 },
      }));
    // the engine's validator rejects a zero-total entry; it has no balance effect anyway
    if (items.every((item) => item.amount === 0)) continue;

    people.add(expense.createdBy);
    for (const share of expense.shares) people.add(share.userId);
    entries.push({
      kind: 'expense',
      currencyCode: LEDGER_CURRENCY,
      primaryPayer: expense.createdBy,
      items,
    });
  }

  for (const payment of payments) {
    if (payment.amountCents <= 0 || payment.fromUserId === payment.toUserId) {
      continue;
    }
    people.add(payment.fromUserId);
    people.add(payment.toUserId);
    entries.push({
      kind: 'payment',
      currencyCode: LEDGER_CURRENCY,
      primaryPayer: payment.fromUserId,
      items: [
        {
          amount: payment.amountCents,
          beneficiaries: { [payment.toUserId]: 1 },
        },
      ],
    });
  }

  const group: Group = {
    people: [...people],
    defaultCurrencyCode: LEDGER_CURRENCY,
    currencyRates: {},
    entries,
  };
  validateGroup(group);
  const balances = engineBalances(group);

  for (const [userId, cents] of Object.entries(balances)) {
    if (!Number.isInteger(cents)) {
      throw new Error(`Balance for ${userId} is not whole cents: ${cents}`);
    }
  }
  return { ...balances };
};

/** Same thing in euros/USD major units, for display. */
export const calculateBalances = (
  expenses: BalanceExpenseInput[],
  roster: string[],
  payments: BalancePaymentInput[] = [],
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(calculateBalancesInCents(expenses, roster, payments)).map(
      ([userId, cents]) => [userId, toEuro(cents)],
    ),
  );
