import type { BeneficiaryFractions, PersonId } from '../types';

function normalizeWeights(weights: Readonly<Record<PersonId, number>>): BeneficiaryFractions {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (!(total > 0)) {
    throw new RangeError('Portion weights must add up to a positive number');
  }
  return Object.fromEntries(
    Object.entries(weights).map(([personId, weight]) => [personId, weight / total]),
  );
}

/** Everyone listed pays the same part. */
export function splitEqually(people: readonly PersonId[]): BeneficiaryFractions {
  return normalizeWeights(Object.fromEntries(people.map((personId) => [personId, 1])));
}

/** Integer shares, e.g. { alice: 2, bob: 1 } → alice pays 2/3 (Entry.Portions "Shares" mode). */
export function splitByShares(shares: Readonly<Record<PersonId, number>>): BeneficiaryFractions {
  return normalizeWeights(shares);
}

/** Percentages, e.g. { alice: 70, bob: 30 }. */
export function splitByPercentages(
  percentages: Readonly<Record<PersonId, number>>,
): BeneficiaryFractions {
  return normalizeWeights(percentages);
}

/** Exact amounts per person; fractions are relative to their total. */
export function splitByAmounts(amounts: Readonly<Record<PersonId, number>>): BeneficiaryFractions {
  return normalizeWeights(amounts);
}
