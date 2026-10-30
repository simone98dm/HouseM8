export interface DayGroup<T> {
  /** Local calendar day, `YYYY-MM-DD`. */
  key: string;
  date: Date;
  kind: 'today' | 'yesterday' | 'date';
  items: T[];
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Buckets items by the local calendar day of `getDate(item)`, keeping the
 * input order (callers pass newest-first). Items with an invalid date land in
 * the last group of their neighbour rather than being dropped.
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | Date | undefined,
  now: Date = new Date(),
): DayGroup<T>[] {
  const today = dayKey(now);
  const yesterday = dayKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  );
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const raw = getDate(item);
    const date = raw ? new Date(raw) : new Date(NaN);
    const valid = !Number.isNaN(date.getTime());
    const key = valid ? dayKey(date) : (groups.at(-1)?.key ?? 'unknown');
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.items.push(item);
      continue;
    }
    groups.push({
      key,
      date: valid ? date : (last?.date ?? new Date(NaN)),
      kind: key === today ? 'today' : key === yesterday ? 'yesterday' : 'date',
      items: [item],
    });
  }
  return groups;
}
