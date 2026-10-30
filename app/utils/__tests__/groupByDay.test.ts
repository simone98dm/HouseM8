import { describe, it, expect } from 'vitest';
import { groupByDay } from '../groupByDay';

const NOW = new Date(2026, 9, 28, 12);
const at = (day: number, h = 10) => new Date(2026, 9, day, h).toISOString();

describe('groupByDay', () => {
  it('buckets by local day, labelling today and yesterday', () => {
    const items = [
      { id: 'a', d: at(28, 11) },
      { id: 'b', d: at(28, 9) },
      { id: 'c', d: at(27) },
      { id: 'd', d: at(20) },
    ];
    const groups = groupByDay(items, (i) => i.d, NOW);

    expect(groups.map((g) => g.kind)).toEqual(['today', 'yesterday', 'date']);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('keeps invalid dates with the previous group instead of dropping them', () => {
    const groups = groupByDay([{ d: at(28) }, { d: 'nope' }], (i) => i.d, NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toHaveLength(2);
  });

  it('returns no groups for an empty list', () => {
    expect(groupByDay([], () => undefined, NOW)).toEqual([]);
  });
});

describe('groupByDay — calendar edges', () => {
  it('treats the previous month/year boundary as yesterday', () => {
    const now = new Date(2026, 0, 1, 9);
    const groups = groupByDay(
      [{ d: new Date(2025, 11, 31, 23, 59).toISOString() }],
      (i) => i.d,
      now,
    );
    expect(groups[0]!.kind).toBe('yesterday');
    expect(groups[0]!.key).toBe('2025-12-31');
  });

  it('splits at local midnight, not 24h windows', () => {
    const items = [
      { d: new Date(2026, 9, 28, 0, 0, 1).toISOString() },
      { d: new Date(2026, 9, 27, 23, 59, 59).toISOString() },
    ];
    const groups = groupByDay(items, (i) => i.d, NOW);
    expect(groups.map((g) => g.key)).toEqual(['2026-10-28', '2026-10-27']);
  });

  it('keeps yesterday correct across a DST change (23h/25h days)', () => {
    // EU DST ends 2026-10-25; "now" the day after, yesterday is the 25th.
    const now = new Date(2026, 9, 26, 12);
    const groups = groupByDay(
      [{ d: new Date(2026, 9, 25, 12).toISOString() }],
      (i) => i.d,
      now,
    );
    expect(groups[0]!.kind).toBe('yesterday');
  });

  it('accepts Date objects and ignores undefined/empty values as invalid', () => {
    const groups = groupByDay(
      [{ d: new Date(2026, 9, 28, 8) }, { d: undefined }, { d: '' }],
      (i) => i.d,
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toHaveLength(3);
  });

  it('puts a leading invalid date in an "unknown" group', () => {
    const groups = groupByDay([{ d: 'bad' }, { d: at(28) }], (i) => i.d, NOW);
    expect(groups.map((g) => g.key)).toEqual(['unknown', '2026-10-28']);
    expect(groups[0]!.kind).toBe('date');
  });

  it('makes a new group when the same day reappears non-adjacently', () => {
    const groups = groupByDay(
      [{ d: at(28) }, { d: at(27) }, { d: at(28) }],
      (i) => i.d,
      NOW,
    );
    expect(groups).toHaveLength(3);
  });
});
