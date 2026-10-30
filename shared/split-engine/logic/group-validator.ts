import { FRACTION_SUM_TOLERANCE } from '../constants';
import type { Entry, Group } from '../types';

export class GroupValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid group:\n- ${problems.join('\n- ')}`);
    this.name = 'GroupValidationError';
  }
}

function entryProblems(entry: Entry, index: number, group: Group): string[] {
  const label = `entry #${index}`;
  const isKnown = (personId: string): boolean => group.people.includes(personId);
  const problems: string[] = [];

  if (!isKnown(entry.primaryPayer)) problems.push(`${label}: unknown payer "${entry.primaryPayer}"`);
  if (entry.currencyCode !== group.defaultCurrencyCode && !(entry.currencyCode in group.currencyRates)) {
    problems.push(`${label}: no exchange rate for ${entry.currencyCode}`);
  }

  const total = entry.items.reduce((sum, item) => sum + item.amount, 0);
  if (entry.items.some((item) => !Number.isFinite(item.amount) || item.amount < 0)) {
    problems.push(`${label}: amounts must be non-negative numbers`);
  }
  if (total === 0) problems.push(`${label}: total amount is zero`);

  for (const item of entry.items) {
    const fractions = Object.entries(item.beneficiaries);
    if (fractions.length === 0) problems.push(`${label}: item without beneficiaries`);
    for (const [personId, fraction] of fractions) {
      if (!isKnown(personId)) problems.push(`${label}: unknown beneficiary "${personId}"`);
      if (!(fraction >= 0 && fraction <= 1)) problems.push(`${label}: fraction out of range for "${personId}"`);
    }
    const fractionSum = fractions.reduce((sum, [, fraction]) => sum + fraction, 0);
    if (fractions.length > 0 && Math.abs(1 - fractionSum) > FRACTION_SUM_TOLERANCE) {
      problems.push(`${label}: beneficiary fractions must sum to 1 (got ${fractionSum})`);
    }
  }

  if (entry.kind === 'payment') {
    const receivers = Object.keys(entry.items[0]?.beneficiaries ?? {});
    if (receivers.length > 1) problems.push(`${label}: a payment has exactly one receiver`);
    if (receivers.includes(entry.primaryPayer)) problems.push(`${label}: payer and receiver are the same`);
  }

  const secondary = Object.entries(entry.secondaryPayers ?? {});
  for (const [personId, amount] of secondary) {
    if (personId === entry.primaryPayer) problems.push(`${label}: "${personId}" is listed as payer twice`);
    if (!isKnown(personId)) problems.push(`${label}: unknown secondary payer "${personId}"`);
    if (!(amount >= 0)) problems.push(`${label}: negative secondary payer amount`);
  }
  if (secondary.length > 0 && secondary.reduce((sum, [, amount]) => sum + amount, 0) >= total) {
    problems.push(`${label}: secondary payers cover the whole amount`);
  }
  return problems;
}

/** Port of the entry rules in ModelObjectValidator. Throws on the first invalid group. */
export function validateGroup(group: Group): void {
  const problems = group.entries.flatMap((entry, index) => entryProblems(entry, index, group));
  if (problems.length > 0) throw new GroupValidationError(problems);
}
