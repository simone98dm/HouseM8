import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPENSE_CATEGORIES } from '~~/shared/constants/categories';
import { CATEGORY_META } from '~/constants/categories';
import { categoryGuess, resolveCategory } from '~/utils/categoryGuess';

describe('categoryGuess', () => {
  const cases: [string, string][] = [
    ['Affitto novembre', 'rent'],
    ['Rent', 'rent'],
    ['Bolletta luce', 'utilities'],
    ['Gas', 'utilities'],
    ['Electricity bill', 'utilities'],
    ['Acqua', 'utilities'],
    ['Water', 'utilities'],
    ['Fibra Vodafone', 'utilities'],
    ['Wifi', 'utilities'],
    ['Spesa Lidl', 'groceries'],
    ['Esselunga', 'groceries'],
    ['Groceries', 'groceries'],
    ['Netflix', 'subscriptions'],
    ['Abbonamento Spotify', 'subscriptions'],
    ['Pizza venerdì', 'dining'],
    ['Ristorante', 'dining'],
    ['Bar', 'dining'],
    ['Eating out', 'dining'],
    ['Barilla', 'other'],
    ['', 'other'],
    ['Cleaning stuff', 'other'],
  ];
  for (const [desc, category] of cases) {
    it(`"${desc}" -> ${category}`, () => {
      expect(categoryGuess(desc)).toBe(category);
    });
  }

  it('prefers the first valid stored category over the guess', () => {
    expect(resolveCategory(['utilities', 'rent'], 'Netflix')).toBe('utilities');
    expect(resolveCategory(['bogus', 'travel'], 'Netflix')).toBe('travel');
    expect(resolveCategory(['bogus'], 'Netflix')).toBe('subscriptions');
    expect(resolveCategory([], 'Spesa')).toBe('groceries');
    expect(resolveCategory(null, 'Spesa')).toBe('groceries');
  });
});

describe('category tokens contrast', () => {
  const css = readFileSync(
    resolve(__dirname, '../../assets/css/tokens.css'),
    'utf8',
  );
  const themeBlock = (selector: string) =>
    css.slice(css.indexOf(`${selector} {`)).split('\n  }')[0] ?? '';
  const themes = {
    light: { block: themeBlock(':root'), surface: '#ffffff' },
    dark: { block: themeBlock('.dark'), surface: '#131629' },
  };
  const hex = (block: string, token: string): string => {
    const m = block.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, 'i'));
    if (!m) throw new Error(`missing ${token}`);
    return m[1]!;
  };
  const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };

  for (const [theme, { block, surface }] of Object.entries(themes)) {
    for (const category of EXPENSE_CATEGORIES) {
      const { subtleToken, fgToken } = CATEGORY_META[category];
      it(`${category} (${theme}): text >=4.5:1 on tint and surface, icon >=3:1`, () => {
        const tint = hex(block, subtleToken);
        const fg = hex(block, fgToken);
        expect(ratio(fg, tint)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(fg, surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
