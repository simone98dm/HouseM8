const MS_PER_DAY = 86_400_000;
/** A bill due within this many days (or overdue) carries a status word. */
const DUE_SOON_DAYS = 7;

export type DueStatus = 'overdue' | 'soon' | 'later';

/**
 * A due date as the API sends it ('YYYY-MM-DD', a calendar day with no time
 * zone, or a full timestamp) turned into display text in the active locale,
 * plus whether it has passed. Parsed as a local day so "2026-10-31" never
 * shows as the 30th west of UTC.
 *
 * `formatDueRelative` and `dueStatus` are the one wording for "when" on Home
 * and Bills: "today", "tomorrow", "in 4 days", "overdue by 2 days", with
 * "Overdue" / "Due soon" as the status word beside it.
 */
export const useDueDate = () => {
  const { t } = useI18n();
  const { formatShort } = useDate();

  const parseDay = (iso: string): Date => {
    const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /** "Fri, Oct 31" / IT "ven 31 ott". */
  const formatDue = (iso: string): string =>
    formatShort(parseDay(iso), { weekday: true, year: false });

  /** Calendar days from `now` to the due day: negative once it has passed. */
  const daysUntilDue = (iso: string, now: Date = new Date()): number => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((parseDay(iso).getTime() - today.getTime()) / MS_PER_DAY);
  };

  /** Today still counts as on time. */
  const isOverdue = (iso: string, now: Date = new Date()): boolean =>
    daysUntilDue(iso, now) < 0;

  const dueStatus = (iso: string, now: Date = new Date()): DueStatus => {
    const days = daysUntilDue(iso, now);
    if (days < 0) return 'overdue';
    return days <= DUE_SOON_DAYS ? 'soon' : 'later';
  };

  const formatDueRelative = (iso: string, now: Date = new Date()): string => {
    const days = daysUntilDue(iso, now);
    if (days === 0) return t('bills.dueRelative.today');
    if (days === 1) return t('bills.dueRelative.tomorrow');
    if (days > 1) return t('bills.dueRelative.inDays', { n: days }, days);
    return t('bills.dueRelative.overdueDays', { n: -days }, -days);
  };

  return { formatDue, formatDueRelative, daysUntilDue, dueStatus, isOverdue };
};
