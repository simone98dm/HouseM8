import type { Balances, Entry, Group, PersonId } from '../types';
import { conversionFactor } from '../utils/currency';

type MutableBalances = Record<PersonId, number>;

function addTo(balances: MutableBalances, personId: PersonId, amount: number): void {
  balances[personId] = (balances[personId] ?? 0) + amount;
}

function entryTotal(entry: Entry): number {
  return entry.items.reduce((sum, item) => sum + item.amount, 0);
}

function applyEntry(balances: MutableBalances, entry: Entry, factor: number): void {
  // Whoever paid gets credited, then the secondary payers' share is moved
  // from the primary payer to them.
  addTo(balances, entry.primaryPayer, entryTotal(entry) * factor);
  for (const [payerId, amount] of Object.entries(entry.secondaryPayers ?? {})) {
    addTo(balances, payerId, amount * factor);
    addTo(balances, entry.primaryPayer, -amount * factor);
  }

  // Whoever benefited gets debited their fraction of each item.
  for (const item of entry.items) {
    for (const [beneficiaryId, fraction] of Object.entries(item.beneficiaries)) {
      addTo(balances, beneficiaryId, -fraction * item.amount * factor);
    }
  }
}

/**
 * Net balance of every person, in the group's default currency
 * (port of Balance.b with flags = 0).
 */
export function calculateBalances(group: Group): Balances {
  // ponytail: local accumulator, never escapes this function.
  const balances: MutableBalances = Object.fromEntries(group.people.map((id) => [id, 0]));
  for (const entry of group.entries) {
    const factor = conversionFactor(
      group.currencyRates,
      entry.currencyCode,
      group.defaultCurrencyCode,
    );
    applyEntry(balances, entry, factor);
  }
  return balances;
}
