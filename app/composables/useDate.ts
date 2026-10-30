/**
 * useDate composable
 * Centralizes all date formatting so output follows the app's active i18n
 * locale (EN/IT) instead of the browser's. Formats below were derived from
 * an inventory of every toLocaleDateString/Intl.DateTimeFormat call site
 * in the app — no format exists here that isn't used by real UI.
 */

export type DateInput = string | number | Date | null | undefined;

// A bare calendar day ('2026-10-31') has no time zone. `new Date()` reads it as
// UTC midnight, which shows as the 30th west of UTC and disagrees with
// useDueDate's local parsing; read it as a local day instead.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseInput = (input: string | number | Date): Date => {
  if (typeof input !== 'string') return new Date(input);
  const m = DATE_ONLY.exec(input);
  return m ? new Date(+m[1]!, +m[2]! - 1, +m[3]!) : new Date(input);
};

const toValidDate = (input: DateInput): Date | null => {
  if (input === null || input === undefined || input === '') return null;
  const date = input instanceof Date ? input : parseInput(input);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const useDate = () => {
  const { t, locale } = useI18n();

  /** Formats with the given Intl options, guarding null/undefined and invalid dates. */
  const format = (
    input: DateInput,
    options: Intl.DateTimeFormatOptions,
  ): string => {
    const date = toValidDate(input);
    if (!date) {
      // No date provided at all → render nothing (matches existing
      // call-site guards like `if (!date) return ''`).
      if (input === null || input === undefined || input === '') return '';
      // A value was provided but failed to parse → say so, translated.
      return t('common.invalidDate');
    }
    return date.toLocaleDateString(locale.value, options);
  };

  /**
   * Short date: "Aug 13, 2026" / IT "13 ago 2026".
   * `year: false` → "Aug 13". `weekday: true` → "Thu, Aug 13, 2026".
   */
  const formatShort = (
    input: DateInput,
    options: { weekday?: boolean; year?: boolean } = {},
  ): string => {
    const { weekday = false, year = true } = options;
    return format(input, {
      ...(weekday && { weekday: 'short' }),
      month: 'short',
      day: 'numeric',
      ...(year && { year: 'numeric' }),
    });
  };

  /**
   * Long/verbose date: "Thursday, August 13, 2026" / IT "giovedì 13 agosto 2026".
   * `weekday: false` → "August 13, 2026".
   */
  const formatLong = (
    input: DateInput,
    options: { weekday?: boolean } = {},
  ): string => {
    const { weekday = true } = options;
    return format(input, {
      ...(weekday && { weekday: 'long' }),
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Month + year only: "August 2026" / IT "agosto 2026".
   * `style: 'short'` → "Aug 2026".
   */
  const formatMonthYear = (
    input: DateInput,
    options: { style?: 'long' | 'short' } = {},
  ): string => {
    const { style = 'long' } = options;
    return format(input, { month: style, year: 'numeric' });
  };

  /** Month name only: "August" / IT "agosto". */
  const formatMonthName = (input: DateInput): string =>
    format(input, { month: 'long' });

  /** Date and time without the year: "Oct 28, 10:00" / IT "28 ott, 10:00". */
  const formatDateTime = (input: DateInput): string =>
    format(input, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return {
    formatDateTime,
    formatShort,
    formatLong,
    formatMonthYear,
    formatMonthName,
  };
};
