import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from '~~/shared/constants/categories';

// Keyword stems (it + en), matched at word start on accent-stripped lowercase
// text. First matching rule wins, so order from most to least specific.
const RULES: { category: ExpenseCategory; words: string[] }[] = [
  {
    category: 'rent',
    words: [
      'affitto',
      'rent',
      'canone',
      'pigione',
      'condomini',
      'mutuo',
      'mortgage',
    ],
  },
  {
    category: 'utilities',
    words: [
      'luce',
      'energia',
      'energy',
      'gas',
      'elettric',
      'electric',
      'power',
      'enel',
      'acqua',
      'water',
      'idric',
      'internet',
      'wifi',
      'wi-fi',
      'fibra',
      'fiber',
      'fibre',
      'broadband',
      'adsl',
    ],
  },
  {
    category: 'subscriptions',
    words: [
      'netflix',
      'spotify',
      'disney',
      'amazon prime',
      'dazn',
      'abbonament',
      'subscription',
      'streaming',
    ],
  },
  {
    category: 'groceries',
    words: [
      'spesa',
      'lidl',
      'coop',
      'esselunga',
      'conad',
      'carrefour',
      'supermerc',
      'supermarket',
      'grocer',
    ],
  },
  {
    category: 'dining',
    words: [
      'ristorant',
      'trattoria',
      'pizz',
      'sushi',
      'aperitiv',
      'cena',
      'pranzo',
      'dinner',
      'lunch',
      'eating out',
      'restaurant',
    ],
  },
];

const BAR = /(?<![a-z])bar(?![a-z])/;

const normalise = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Bilingual keyword guess; falls back to `other`. */
export function categoryGuess(
  description: string | null | undefined,
): ExpenseCategory {
  const text = normalise(description ?? '');
  const hit = RULES.find(({ words }) =>
    words.some((w) =>
      new RegExp(`(?<![a-z])${w.replace(/[-]/g, '\\-')}`).test(text),
    ),
  );
  return hit?.category ?? (BAR.test(text) ? 'dining' : 'other');
}

export const isExpenseCategory = (value: unknown): value is ExpenseCategory =>
  typeof value === 'string' &&
  (EXPENSE_CATEGORIES as readonly string[]).includes(value);

/** Prefer the first stored category, fall back to the keyword guess. */
export function resolveCategory(
  stored: readonly string[] | null | undefined,
  description: string | null | undefined,
): ExpenseCategory {
  return stored?.find(isExpenseCategory) ?? categoryGuess(description);
}
