import { describe, expect, it } from 'vitest';
import { conversionFactor, roundToFractionDigits } from '../utils/currency';
import { splitByAmounts, splitByPercentages, splitByShares, splitEqually } from '../utils/portions';

describe('portions', () => {
  it('splits equally', () => {
    expect(splitEqually(['a', 'b', 'c', 'd'])).toEqual({ a: 0.25, b: 0.25, c: 0.25, d: 0.25 });
  });

  it('normalizes shares, percentages and amounts into fractions', () => {
    expect(splitByShares({ a: 3, b: 1 })).toEqual({ a: 0.75, b: 0.25 });
    expect(splitByPercentages({ a: 70, b: 30 })).toEqual({ a: 0.7, b: 0.3 });
    expect(splitByAmounts({ a: 12, b: 8 })).toEqual({ a: 0.6, b: 0.4 });
  });

  it('rejects empty or zero weights', () => {
    expect(() => splitEqually([])).toThrow(RangeError);
    expect(() => splitByShares({ a: 0 })).toThrow(RangeError);
  });
});

describe('currency', () => {
  it('converts using values relative to a common base', () => {
    const rates = { USD: 1, EUR: 1.25, JPY: 0.01 };
    expect(conversionFactor(rates, 'USD', 'EUR')).toBeCloseTo(0.8);
    expect(conversionFactor(rates, 'EUR', 'JPY')).toBeCloseTo(125);
    expect(conversionFactor(rates, 'EUR', 'EUR')).toBe(1);
  });

  it('rounds to the currency precision', () => {
    expect(roundToFractionDigits(1.005 + 1e-9, 2)).toBe(1.01);
    expect(roundToFractionDigits(1234.5, 0)).toBe(1235);
  });
});
