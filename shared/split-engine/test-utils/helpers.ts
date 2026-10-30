import type { Balances, Entry, Group } from '../types';
import type { Transfer } from '../logic/payments-minimizer';

export function makeGroup(people: string[], entries: Entry[], overrides: Partial<Group> = {}): Group {
  return { people, defaultCurrencyCode: 'EUR', currencyRates: { EUR: 1 }, entries, ...overrides };
}

export function expense(payer: string, amount: number, beneficiaries: Record<string, number>, extra: Partial<Entry> = {}): Entry {
  return { kind: 'expense', currencyCode: 'EUR', primaryPayer: payer, items: [{ amount, beneficiaries }], ...extra };
}

/** Balances left after applying the transfers; all ~0 when the plan settles the group. */
export function applyTransfers(balances: Balances, transfers: readonly Transfer[]): Record<string, number> {
  return transfers.reduce<Record<string, number>>(
    (acc, { from, to, amount }) => ({ ...acc, [from]: (acc[from] ?? 0) + amount, [to]: (acc[to] ?? 0) - amount }),
    { ...balances },
  );
}

/** Deterministic PRNG (mulberry32) so random tests are reproducible. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Brute-force optimum: (#non-zero balances) − (max number of disjoint zero-sum
 * groups they can be partitioned into). Works on integer cents.
 */
export function optimalPaymentCount(cents: readonly number[]): number {
  const values = cents.filter((value) => value !== 0);
  const n = values.length;
  const full = (1 << n) - 1;
  const sums = new Array<number>(1 << n).fill(0);
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask;
    sums[mask] = sums[mask ^ low]! + values[Math.log2(low)]!;
  }
  const best = new Array<number>(1 << n).fill(0);
  for (let mask = 1; mask <= full; mask++) {
    let groups = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) groups = Math.max(groups, best[mask ^ (1 << i)]!);
    }
    best[mask] = groups + (sums[mask] === 0 ? 1 : 0);
  }
  return n - best[full]!;
}
