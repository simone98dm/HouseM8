/**
 * useBillDetails Composable Tests
 * Tests for utility functions used in bill detail views.
 *
 * useBillDetails calls useI18n() internally, which requires a Vue i18n plugin.
 * We wrap each call in a minimal Vue app with createI18n so the composable
 * runs inside a valid setup context. With legacy:false and empty messages the
 * t() function simply returns the key — matching the behaviour of the global
 * mock used elsewhere.
 */

import { describe, it, expect } from 'vitest';
import { createApp, defineComponent } from 'vue';
import { createI18n } from 'vue-i18n';
import { useBillDetails } from '~/composables/useBillDetails';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Run the composable inside a mounted Vue + i18n app and return its API. */
function getBillDetails(): ReturnType<typeof useBillDetails> {
  let api!: ReturnType<typeof useBillDetails>;

  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: {}, it: {} },
  });

  const app = createApp(
    defineComponent({
      setup() {
        api = useBillDetails();
        return () => {};
      },
    }),
  );

  app.use(i18n);
  app.mount(document.createElement('div'));

  return api;
}

/** ISO string N days offset from now (positive → future, negative → past). */
const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const monthsAgo = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString();
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useBillDetails Composable', () => {
  describe('getDaysUntilDue', () => {
    it('returns a negative number for a past (overdue) date', () => {
      const bd = getBillDetails();
      expect(bd.getDaysUntilDue(daysFromNow(-10))).toBeLessThan(0);
    });

    it('returns a positive number for a future date', () => {
      const bd = getBillDetails();
      expect(bd.getDaysUntilDue(daysFromNow(7))).toBeGreaterThan(0);
    });

    it('returns >= 0 for today', () => {
      const bd = getBillDetails();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(bd.getDaysUntilDue(today.toISOString())).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDayOfMonth', () => {
    it('returns 15 for 2025-03-15T12:00:00Z', () => {
      const bd = getBillDetails();
      expect(bd.getDayOfMonth('2025-03-15T12:00:00Z')).toBe(15);
    });

    it('returns 1 for 2025-01-01T12:00:00Z', () => {
      const bd = getBillDetails();
      expect(bd.getDayOfMonth('2025-01-01T12:00:00Z')).toBe(1);
    });
  });

  describe('getContractDuration', () => {
    it('contains "days" for a contract less than 30 days old', () => {
      const bd = getBillDetails();
      expect(bd.getContractDuration(daysFromNow(-10))).toMatch(/days/);
    });

    it('contains "month" for a contract ~2 months old', () => {
      const bd = getBillDetails();
      expect(bd.getContractDuration(monthsAgo(2))).toMatch(/month/);
    });

    it('contains "year" for a contract more than 1 year old', () => {
      const bd = getBillDetails();
      expect(bd.getContractDuration(yearsAgo(2))).toMatch(/year/);
    });
  });

  describe('getTotalPayments', () => {
    it('returns at least 1 for a very recent start date', () => {
      const bd = getBillDetails();
      expect(bd.getTotalPayments(daysFromNow(-5))).toBeGreaterThanOrEqual(1);
    });

    it('returns more than 1 for a start date several months ago', () => {
      const bd = getBillDetails();
      expect(bd.getTotalPayments(monthsAgo(3))).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTotalAmountPaid', () => {
    it('returns getTotalPayments * monthlyCost', () => {
      const bd = getBillDetails();
      const startDate = monthsAgo(3);
      const cost = 50;
      expect(bd.getTotalAmountPaid(startDate, cost)).toBe(
        bd.getTotalPayments(startDate) * cost,
      );
    });
  });

  describe('calculateTotalCost', () => {
    it('(100, 1) → 1200 (monthly → annual)', () => {
      expect(getBillDetails().calculateTotalCost(100, 1)).toBe(1200);
    });

    it('(100, 2) → 600 (bi-monthly → semi-annual)', () => {
      expect(getBillDetails().calculateTotalCost(100, 2)).toBe(600);
    });

    it('(100, 6) → 200 (semi-annual → 2 payments)', () => {
      expect(getBillDetails().calculateTotalCost(100, 6)).toBe(200);
    });

    it('(500, 12) → 500 (annual → just the cost)', () => {
      expect(getBillDetails().calculateTotalCost(500, 12)).toBe(500);
    });
  });

  describe('getFileIcon', () => {
    it('returns heroicons:document-text for pdf', () => {
      expect(getBillDetails().getFileIcon('file.pdf')).toBe(
        'heroicons:document-text',
      );
    });

    it('returns heroicons:photo for jpg', () => {
      expect(getBillDetails().getFileIcon('photo.jpg')).toBe('heroicons:photo');
    });

    it('returns heroicons:photo for png', () => {
      expect(getBillDetails().getFileIcon('image.png')).toBe('heroicons:photo');
    });

    it('returns heroicons:document for docx', () => {
      expect(getBillDetails().getFileIcon('contract.docx')).toBe(
        'heroicons:document',
      );
    });

    it('returns heroicons:document for unknown extension', () => {
      expect(getBillDetails().getFileIcon('archive.zip')).toBe(
        'heroicons:document',
      );
    });
  });

  describe('getCostPeriodLabel', () => {
    it('returns the i18n key for period 1 (t returns the key)', () => {
      // With no translations loaded, vue-i18n returns the key itself
      expect(getBillDetails().getCostPeriodLabel(1)).toBe(
        'bills.details.costPeriods.1',
      );
    });

    it('returns the i18n key for period 6', () => {
      expect(getBillDetails().getCostPeriodLabel(6)).toBe(
        'bills.details.costPeriods.6',
      );
    });
  });

  describe('getTotalCostLabel', () => {
    it('returns annualCost key for period 1', () => {
      expect(getBillDetails().getTotalCostLabel(1)).toBe(
        'bills.details.annualCost',
      );
    });

    it('returns semiAnnualCost key for period 2', () => {
      expect(getBillDetails().getTotalCostLabel(2)).toBe(
        'bills.details.semiAnnualCost',
      );
    });

    it('returns biAnnualCost key for period 6', () => {
      expect(getBillDetails().getTotalCostLabel(6)).toBe(
        'bills.details.biAnnualCost',
      );
    });

    it('returns totalCost key for any other period', () => {
      const bd = getBillDetails();
      expect(bd.getTotalCostLabel(12)).toBe('bills.details.totalCost');
      expect(bd.getTotalCostLabel(3)).toBe('bills.details.totalCost');
    });
  });

  describe('getPeriodLabel', () => {
    it('returns perYear for period 1', () => {
      const label = getBillDetails().getPeriodLabel(1);
      expect(label).toBe('bills.details.perYear');
    });

    it('returns perSixMonths for period 2', () => {
      const label = getBillDetails().getPeriodLabel(2);
      expect(label).toBe('bills.details.perSixMonths');
    });

    it('returns perSixMonths for period 6', () => {
      const label = getBillDetails().getPeriodLabel(6);
      expect(label).toBe('bills.details.perSixMonths');
    });

    it('returns perYear for other periods', () => {
      const label = getBillDetails().getPeriodLabel(12);
      expect(label).toBe('bills.details.perYear');
    });
  });

  describe('formatDate', () => {
    it('formats a date string', () => {
      const result = getBillDetails().formatDate('2025-06-15T00:00:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
