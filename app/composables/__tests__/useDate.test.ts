/**
 * useDate Composable Tests
 *
 * useDate calls useI18n() internally, which requires a Vue i18n plugin.
 * We wrap each call in a minimal Vue app with createI18n so the composable
 * runs inside a valid setup context — same pattern as useBillDetails.test.ts.
 * With legacy:false and empty messages, t() returns the key itself, so
 * `common.invalidDate` assertions check for that literal key.
 */

import { describe, it, expect } from 'vitest';
import { createApp, defineComponent } from 'vue';
import { createI18n } from 'vue-i18n';
import { useDate } from '~/composables/useDate';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Run the composable inside a mounted Vue + i18n app for the given locale. */
function getDate(locale: 'en' | 'it' = 'en'): ReturnType<typeof useDate> {
  let api!: ReturnType<typeof useDate>;

  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { en: {}, it: {} },
  });

  const app = createApp(
    defineComponent({
      setup() {
        api = useDate();
        return () => {};
      },
    }),
  );

  app.use(i18n);
  app.mount(document.createElement('div'));

  return api;
}

const FIXED_DATE = '2026-08-13T00:00:00Z'; // Thursday

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useDate Composable', () => {
  describe('formatShort', () => {
    it('formats in EN as "Aug 13, 2026"', () => {
      expect(getDate('en').formatShort(FIXED_DATE)).toBe('Aug 13, 2026');
    });

    it('formats in IT as "13 ago 2026"', () => {
      expect(getDate('it').formatShort(FIXED_DATE)).toBe('13 ago 2026');
    });

    it('omits the year when year:false', () => {
      expect(getDate('en').formatShort(FIXED_DATE, { year: false })).toBe(
        'Aug 13',
      );
      expect(getDate('it').formatShort(FIXED_DATE, { year: false })).toBe(
        '13 ago',
      );
    });

    it('includes the weekday when weekday:true', () => {
      expect(getDate('en').formatShort(FIXED_DATE, { weekday: true })).toBe(
        'Thu, Aug 13, 2026',
      );
      expect(getDate('it').formatShort(FIXED_DATE, { weekday: true })).toBe(
        'gio 13 ago 2026',
      );
    });

    it('accepts a Date object', () => {
      expect(getDate('en').formatShort(new Date(FIXED_DATE))).toBe(
        'Aug 13, 2026',
      );
    });
  });

  describe('formatLong', () => {
    it('formats in EN as "Thursday, August 13, 2026"', () => {
      expect(getDate('en').formatLong(FIXED_DATE)).toBe(
        'Thursday, August 13, 2026',
      );
    });

    it('formats in IT with full weekday and month', () => {
      expect(getDate('it').formatLong(FIXED_DATE)).toBe(
        'giovedì 13 agosto 2026',
      );
    });

    it('omits the weekday when weekday:false', () => {
      expect(getDate('en').formatLong(FIXED_DATE, { weekday: false })).toBe(
        'August 13, 2026',
      );
      expect(getDate('it').formatLong(FIXED_DATE, { weekday: false })).toBe(
        '13 agosto 2026',
      );
    });
  });

  describe('formatMonthYear', () => {
    it('formats in EN as "August 2026"', () => {
      expect(getDate('en').formatMonthYear(FIXED_DATE)).toBe('August 2026');
    });

    it('formats in IT as "agosto 2026"', () => {
      expect(getDate('it').formatMonthYear(FIXED_DATE)).toBe('agosto 2026');
    });

    it('uses short month style when requested', () => {
      expect(
        getDate('en').formatMonthYear(FIXED_DATE, { style: 'short' }),
      ).toBe('Aug 2026');
      expect(
        getDate('it').formatMonthYear(FIXED_DATE, { style: 'short' }),
      ).toBe('ago 2026');
    });
  });

  describe('formatDateTime', () => {
    // Local time, so build the date in the runner's zone.
    const at = new Date(2026, 9, 28, 9, 5);

    it('formats in EN with day, short month and 2-digit time', () => {
      const out = getDate('en').formatDateTime(at);
      expect(out).toContain('Oct 28');
      expect(out).toMatch(/09:05/);
    });

    it('formats in IT with the Italian month', () => {
      const out = getDate('it').formatDateTime(at);
      expect(out).toContain('28 ott');
      expect(out).toContain('09:05');
    });

    it('renders nothing for a missing date', () => {
      expect(getDate('en').formatDateTime(null)).toBe('');
    });
  });

  describe('formatMonthName', () => {
    it('formats in EN as "August"', () => {
      expect(getDate('en').formatMonthName(FIXED_DATE)).toBe('August');
    });

    it('formats in IT as "agosto"', () => {
      expect(getDate('it').formatMonthName(FIXED_DATE)).toBe('agosto');
    });
  });

  describe('null / undefined guarding', () => {
    it('returns empty string for null', () => {
      expect(getDate('en').formatShort(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(getDate('en').formatShort(undefined)).toBe('');
    });

    it('returns empty string for an empty string', () => {
      expect(getDate('en').formatShort('')).toBe('');
    });

    it('applies the same guard across all formats', () => {
      const api = getDate('en');
      expect(api.formatLong(null)).toBe('');
      expect(api.formatMonthYear(undefined)).toBe('');
      expect(api.formatMonthName(null)).toBe('');
    });
  });

  describe('invalid date guarding', () => {
    it('returns the translated invalidDate key for an unparseable string', () => {
      expect(getDate('en').formatShort('not-a-real-date')).toBe(
        'common.invalidDate',
      );
    });

    it('does not render the literal "Invalid Date" browser string', () => {
      const result = getDate('en').formatShort('not-a-real-date');
      expect(result).not.toContain('Invalid Date');
    });
  });
});

describe('useDate date-only strings', () => {
  it('reads a bare calendar day as a local day, never shifted by UTC', () => {
    const { formatShort } = getDate('en');
    expect(formatShort('2026-10-31', { weekday: true, year: false })).toBe(
      'Sat, Oct 31',
    );
    expect(formatShort('2026-11-01', { year: false })).toBe('Nov 1');
  });
});
