import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadLocale = (name: string) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `i18n/locales/${name}.json`), 'utf8'),
  );

const freePlanFeatures = [
  'Up to 5 housemates',
  'Expense splitting',
  'Real-time balances',
  'Bulletin board',
  'Mobile app',
];

const proPlanFeatures = [
  'Everything in Free',
  'Unlimited housemates',
  'Contract vault',
  'Document storage',
  'Issue reporting',
  'Priority support',
  'Custom categories',
];

describe('LandingPricing', () => {
  describe('Free plan', () => {
    it('has 5 features', () => {
      expect(freePlanFeatures).toHaveLength(5);
    });

    it('includes housemate limit', () => {
      expect(freePlanFeatures).toContain('Up to 5 housemates');
    });

    it('includes expense splitting', () => {
      expect(freePlanFeatures).toContain('Expense splitting');
    });

    it('includes real-time balances', () => {
      expect(freePlanFeatures).toContain('Real-time balances');
    });

    it('includes bulletin board', () => {
      expect(freePlanFeatures).toContain('Bulletin board');
    });

    it('includes mobile app', () => {
      expect(freePlanFeatures).toContain('Mobile app');
    });
  });

  describe('Pro plan', () => {
    it('has 7 features', () => {
      expect(proPlanFeatures).toHaveLength(7);
    });

    it('includes everything in Free', () => {
      expect(proPlanFeatures).toContain('Everything in Free');
    });

    it('includes unlimited housemates', () => {
      expect(proPlanFeatures).toContain('Unlimited housemates');
    });

    it('includes contract vault', () => {
      expect(proPlanFeatures).toContain('Contract vault');
    });

    it('includes document storage', () => {
      expect(proPlanFeatures).toContain('Document storage');
    });

    it('includes priority support', () => {
      expect(proPlanFeatures).toContain('Priority support');
    });
  });

  describe('plan comparison', () => {
    it('pro has more features than free', () => {
      expect(proPlanFeatures.length).toBeGreaterThan(freePlanFeatures.length);
    });

    it('free plan does not include contract vault', () => {
      expect(freePlanFeatures).not.toContain('Contract vault');
    });

    it('pro plan includes all free features via "Everything in Free"', () => {
      expect(proPlanFeatures[0]).toBe('Everything in Free');
    });
  });

  describe('pricing data', () => {
    it('free plan price is €0', () => {
      const freePrice = '€0';
      expect(freePrice).toBe('€0');
    });

    it('pro plan price is €4.99', () => {
      const proPrice = '€4.99';
      expect(proPrice).toBe('€4.99');
    });

    // Owner decision 2026-08-18: Pro is sold as "up to 3 houses", NOT per-house.
    // The landing card used to claim both at once — period "per month · per
    // house" directly above a feature row reading "Up to 3 houses" — which is a
    // false price statement to a pre-purchase visitor. This asserts the locale
    // files, so it fails if the per-house wording ever comes back.
    it('does not sell Pro per-house in either locale', () => {
      const en = loadLocale('en').landing.pricing.pro;
      const it = loadLocale('it').landing.pricing.pro;

      expect(en.period).toBe('per month');
      expect(it.period).toBe('al mese');
      expect(en.period).not.toContain('per house');
      expect(it.period).not.toContain('per casa');
      expect(en.features.houses).toBe('Up to 3 houses');
      expect(it.features.houses).toBe('Fino a 3 case');
    });

    it('free plan CTA links to register', () => {
      const link = '/auth/register';
      expect(link).toBe('/auth/register');
    });

    it('pro plan CTA offers 14-day trial', () => {
      const cta = 'Start 14-Day Free Trial';
      expect(cta).toContain('14-Day');
      expect(cta).toContain('Trial');
    });
  });
});
