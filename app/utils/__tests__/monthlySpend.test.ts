import { describe, it, expect } from 'vitest';
import { billShare, monthlySpend } from '../monthlySpend';

describe('monthlySpend', () => {
  it('sums active bills and splits them evenly', () => {
    const bills = [
      { active: true, monthly_cost: 60 },
      { active: true, monthly_cost: 40.5 },
    ];
    expect(monthlySpend(bills, 3)).toEqual({ total: 100.5, share: 33.5 });
  });

  it('ignores inactive bills', () => {
    const bills = [
      { active: true, monthly_cost: 30 },
      { active: false, monthly_cost: 1000 },
    ];
    expect(monthlySpend(bills, 1)).toEqual({ total: 30, share: 30 });
  });

  it('rounds the share up to the cent the user will actually pay', () => {
    expect(monthlySpend([{ active: true, monthly_cost: 10 }], 3).share).toBe(
      3.34,
    );
  });

  it('does not drift when summing many fractional costs', () => {
    const bills = Array.from({ length: 10 }, () => ({
      active: true,
      monthly_cost: 0.1,
    }));
    expect(monthlySpend(bills, 1).total).toBe(1);
  });

  it('accepts costs that arrive as numeric strings', () => {
    const bills = [
      { active: true, monthly_cost: '12.30' as unknown as number },
    ];
    expect(monthlySpend(bills, 1).total).toBe(12.3);
  });

  it('returns zeros with no bills', () => {
    expect(monthlySpend([], 2)).toEqual({ total: 0, share: 0 });
  });

  it('has no share when the house has no members', () => {
    expect(monthlySpend([{ active: true, monthly_cost: 50 }], 0)).toEqual({
      total: 50,
      share: 0,
    });
  });

  it('spreads a multi-month payment over its months', () => {
    const bills = [
      { active: true, monthly_cost: 300, payment_period: 6 },
      { active: true, monthly_cost: 100, payment_period: 1 },
    ];
    expect(monthlySpend(bills, 2)).toEqual({ total: 150, share: 75 });
  });
});

describe('billShare', () => {
  it('rounds the share up by a cent and falls back to the whole cost', () => {
    expect(billShare(100, 3)).toBe(33.34);
    expect(billShare(100, 0)).toBe(100);
  });

  it('charges the whole cost to a house of one', () => {
    expect(billShare(42.5, 1)).toBe(42.5);
  });

  it('charges the whole cost when the member count is negative', () => {
    expect(billShare(10, -2)).toBe(10);
  });

  it('is zero for a free bill', () => {
    expect(billShare(0, 3)).toBe(0);
  });

  it('gives the odd cent to the share, never less than the cost overall', () => {
    expect(billShare(0.01, 2)).toBe(0.01);
    expect(billShare(10.01, 2)).toBe(5.01);
    expect(billShare(0.1 + 0.2, 3)).toBe(0.1);
  });

  it('accepts a numeric-string cost', () => {
    expect(billShare('9.99' as unknown as number, 3)).toBe(3.33);
  });
});
