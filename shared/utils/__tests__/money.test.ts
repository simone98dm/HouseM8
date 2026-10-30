import { describe, it, expect } from 'vitest';

import { splitEvenly, toCents, toEuro } from '../money';

describe('toCents / toEuro round-trips', () => {
  it('handles the classic 0.1 + 0.2 float trap', () => {
    const cents = toCents(0.1 + 0.2);
    expect(cents).toBe(30);
    expect(toEuro(cents)).toBe(0.3);
  });

  it('round-trips 19.99 exactly', () => {
    const cents = toCents(19.99);
    expect(cents).toBe(1999);
    expect(toEuro(cents)).toBe(19.99);
  });

  it('round-trips 0.07 exactly', () => {
    const cents = toCents(0.07);
    expect(cents).toBe(7);
    expect(toEuro(cents)).toBe(0.07);
  });

  it('round-trips a whole euro amount', () => {
    expect(toCents(42)).toBe(4200);
    expect(toEuro(4200)).toBe(42);
  });
});

describe('splitEvenly', () => {
  it('divides exactly when the total is a multiple of the share count', () => {
    expect(splitEvenly(900, 3)).toEqual([300, 300, 300]);
  });

  it('spreads a remainder one cent at a time', () => {
    const shares = splitEvenly(1000, 3);
    expect(shares).toEqual([334, 333, 333]);
    const max = Math.max(...shares);
    const min = Math.min(...shares);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it('always sums back to exactly the total across varied inputs', () => {
    const cases: Array<[number, number]> = [
      [1000, 3],
      [1, 7],
      [999, 4],
      [10_000, 6],
      [7, 7],
      [123456789, 11],
    ];

    for (const [total, count] of cases) {
      const shares = splitEvenly(total, count);
      const sum = shares.reduce((acc, cent) => acc + cent, 0);
      expect(sum).toBe(total);
    }
  });

  it('is deterministic: the same offset always produces the same result', () => {
    const first = splitEvenly(1000, 3, 5);
    const second = splitEvenly(1000, 3, 5);
    expect(first).toEqual(second);
  });

  it('rotates which participant absorbs the extra cent as the offset changes', () => {
    const offset0 = splitEvenly(1000, 3, 0);
    const offset1 = splitEvenly(1000, 3, 1);
    const offset2 = splitEvenly(1000, 3, 2);

    expect(offset0).toEqual([334, 333, 333]);
    expect(offset1).toEqual([333, 334, 333]);
    expect(offset2).toEqual([333, 333, 334]);

    // three different offsets, three different rotations
    expect(offset0).not.toEqual(offset1);
    expect(offset1).not.toEqual(offset2);
    expect(offset0).not.toEqual(offset2);
  });

  it('wraps the offset modulo the share count', () => {
    // offset 4 on 3 shares behaves like offset 1
    expect(splitEvenly(1000, 3, 4)).toEqual(splitEvenly(1000, 3, 1));
  });

  it('returns the whole amount as a single share when shareCount is 1', () => {
    expect(splitEvenly(1234, 1)).toEqual([1234]);
  });

  it('handles large amounts without precision loss', () => {
    const total = 123_456_789_00; // ~1.23M currency units, in cents
    const shares = splitEvenly(total, 7);
    expect(shares).toHaveLength(7);
    expect(shares.reduce((acc, cent) => acc + cent, 0)).toBe(total);
    for (const cent of shares) {
      expect(Number.isInteger(cent)).toBe(true);
    }
  });

  it('throws on non-integer totalCents', () => {
    expect(() => splitEvenly(100.5, 3)).toThrow(/integer cents/);
  });

  it('returns an empty array for a non-positive share count', () => {
    expect(splitEvenly(1000, 0)).toEqual([]);
  });
});
