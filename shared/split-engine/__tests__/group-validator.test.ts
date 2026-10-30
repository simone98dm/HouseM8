import { describe, expect, it } from 'vitest';
import { GroupValidationError, validateGroup } from '../logic/group-validator';
import type { Entry } from '../types';
import { expense, makeGroup } from '../test-utils/helpers';

function problemsOf(entries: Entry[], people = ['alice', 'bob']): readonly string[] {
  try {
    validateGroup(makeGroup(people, entries));
    return [];
  } catch (error: unknown) {
    if (error instanceof GroupValidationError) return error.problems;
    throw error;
  }
}

describe('validateGroup', () => {
  it('accepts a valid group', () => {
    expect(problemsOf([expense('alice', 10, { alice: 0.5, bob: 0.5 })])).toEqual([]);
  });

  it.each<[string, Entry]>([
    ['unknown payer', expense('zoe', 10, { alice: 1 })],
    ['unknown beneficiary', expense('alice', 10, { zoe: 1 })],
    ['fractions must sum to 1', expense('alice', 10, { alice: 0.5, bob: 0.4 })],
    ['non-negative', expense('alice', -10, { alice: 1 })],
    ['total amount is zero', expense('alice', 0, { alice: 1 })],
    ['without beneficiaries', expense('alice', 10, {})],
    ['no exchange rate', expense('alice', 10, { bob: 1 }, { currencyCode: 'USD' })],
    ['cover the whole amount', expense('alice', 10, { bob: 1 }, { secondaryPayers: { bob: 10 } })],
    ['listed as payer twice', expense('alice', 10, { bob: 1 }, { secondaryPayers: { alice: 1 } })],
    ['payer and receiver are the same', { kind: 'payment', currencyCode: 'EUR', primaryPayer: 'alice', items: [{ amount: 5, beneficiaries: { alice: 1 } }] }],
    ['exactly one receiver', { kind: 'payment', currencyCode: 'EUR', primaryPayer: 'alice', items: [{ amount: 5, beneficiaries: { alice: 0.5, bob: 0.5 } }] }],
  ])('reports "%s"', (expectedProblem, entry) => {
    expect(problemsOf([entry]).join('\n')).toContain(expectedProblem);
  });
});
