import { describe, it, expect } from 'vitest';
import { createApp, defineComponent } from 'vue';
import { createI18n } from 'vue-i18n';
import { useDueDate } from '~/composables/useDueDate';
import en from '~~/i18n/locales/en.json';
import it_ from '~~/i18n/locales/it.json';

const NOW = new Date(2026, 9, 28, 15, 30);

function getDue(locale: 'en' | 'it' = 'en'): ReturnType<typeof useDueDate> {
  let api!: ReturnType<typeof useDueDate>;
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { en, it: it_ },
  });
  const app = createApp(
    defineComponent({
      setup() {
        api = useDueDate();
        return () => {};
      },
    }),
  );
  app.use(i18n);
  app.mount(document.createElement('div'));
  return api;
}

describe('useDueDate relative wording', () => {
  it.each([
    ['2026-10-28', 'today'],
    ['2026-10-29', 'tomorrow'],
    ['2026-11-01', 'in 4 days'],
    ['2026-10-27', 'overdue by 1 day'],
    ['2026-10-26', 'overdue by 2 days'],
  ])('says %s as "%s"', (iso, text) => {
    expect(getDue().formatDueRelative(iso, NOW)).toBe(text);
  });

  it('speaks Italian', () => {
    const due = getDue('it');
    expect(due.formatDueRelative('2026-11-01', NOW)).toBe('tra 4 giorni');
    expect(due.formatDueRelative('2026-10-26', NOW)).toBe(
      'scaduta da 2 giorni',
    );
  });

  it('counts calendar days, not 24h blocks, and accepts timestamps', () => {
    const due = getDue();
    expect(due.daysUntilDue('2026-10-29', new Date(2026, 9, 28, 23, 59))).toBe(
      1,
    );
    expect(due.daysUntilDue('2026-10-29T00:00:00', NOW)).toBe(1);
  });

  it('maps days to one status word for every list', () => {
    const due = getDue();
    expect(due.dueStatus('2026-10-27', NOW)).toBe('overdue');
    expect(due.dueStatus('2026-10-28', NOW)).toBe('soon');
    expect(due.dueStatus('2026-11-04', NOW)).toBe('soon');
    expect(due.dueStatus('2026-11-05', NOW)).toBe('later');
  });
});

describe('useDueDate calendar day', () => {
  it('shows the same day for a date-only string and a late-evening timestamp', () => {
    const { formatDue } = getDue('en');
    expect(formatDue('2026-10-31')).toBe('Sat, Oct 31');
    expect(formatDue('2026-10-31T23:30:00')).toBe('Sat, Oct 31');
  });
});
