import type { ExpenseCategory } from '~~/shared/constants/categories';

export interface CategoryMeta {
  icon: string;
  /** Tailwind utilities backed by --cat-<name>-subtle / --cat-<name>-fg. */
  tintClass: string;
  fgClass: string;
  /** CSS custom property names (see tokens.css). */
  subtleToken: string;
  fgToken: string;
  i18nKey: string;
}

// Class names are written out in full so Tailwind's scanner sees them.
export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  groceries: {
    icon: 'ph:shopping-cart-duotone',
    tintClass: 'bg-cat-groceries-subtle',
    fgClass: 'text-cat-groceries-fg',
    subtleToken: '--cat-groceries-subtle',
    fgToken: '--cat-groceries-fg',
    i18nKey: 'categories.groceries',
  },
  rent: {
    icon: 'ph:key-duotone',
    tintClass: 'bg-cat-rent-subtle',
    fgClass: 'text-cat-rent-fg',
    subtleToken: '--cat-rent-subtle',
    fgToken: '--cat-rent-fg',
    i18nKey: 'categories.rent',
  },
  utilities: {
    icon: 'ph:lightning-duotone',
    tintClass: 'bg-cat-utilities-subtle',
    fgClass: 'text-cat-utilities-fg',
    subtleToken: '--cat-utilities-subtle',
    fgToken: '--cat-utilities-fg',
    i18nKey: 'categories.utilities',
  },
  subscriptions: {
    icon: 'ph:film-strip-duotone',
    tintClass: 'bg-cat-subscriptions-subtle',
    fgClass: 'text-cat-subscriptions-fg',
    subtleToken: '--cat-subscriptions-subtle',
    fgToken: '--cat-subscriptions-fg',
    i18nKey: 'categories.subscriptions',
  },
  transport: {
    icon: 'ph:bus-duotone',
    tintClass: 'bg-cat-transport-subtle',
    fgClass: 'text-cat-transport-fg',
    subtleToken: '--cat-transport-subtle',
    fgToken: '--cat-transport-fg',
    i18nKey: 'categories.transport',
  },
  dining: {
    icon: 'ph:fork-knife-duotone',
    tintClass: 'bg-cat-dining-subtle',
    fgClass: 'text-cat-dining-fg',
    subtleToken: '--cat-dining-subtle',
    fgToken: '--cat-dining-fg',
    i18nKey: 'categories.dining',
  },
  household: {
    icon: 'ph:house-line-duotone',
    tintClass: 'bg-cat-household-subtle',
    fgClass: 'text-cat-household-fg',
    subtleToken: '--cat-household-subtle',
    fgToken: '--cat-household-fg',
    i18nKey: 'categories.household',
  },
  health: {
    icon: 'ph:first-aid-kit-duotone',
    tintClass: 'bg-cat-health-subtle',
    fgClass: 'text-cat-health-fg',
    subtleToken: '--cat-health-subtle',
    fgToken: '--cat-health-fg',
    i18nKey: 'categories.health',
  },
  entertainment: {
    icon: 'ph:game-controller-duotone',
    tintClass: 'bg-cat-entertainment-subtle',
    fgClass: 'text-cat-entertainment-fg',
    subtleToken: '--cat-entertainment-subtle',
    fgToken: '--cat-entertainment-fg',
    i18nKey: 'categories.entertainment',
  },
  travel: {
    icon: 'ph:airplane-tilt-duotone',
    tintClass: 'bg-cat-travel-subtle',
    fgClass: 'text-cat-travel-fg',
    subtleToken: '--cat-travel-subtle',
    fgToken: '--cat-travel-fg',
    i18nKey: 'categories.travel',
  },
  gifts: {
    icon: 'ph:gift-duotone',
    tintClass: 'bg-cat-gifts-subtle',
    fgClass: 'text-cat-gifts-fg',
    subtleToken: '--cat-gifts-subtle',
    fgToken: '--cat-gifts-fg',
    i18nKey: 'categories.gifts',
  },
  other: {
    icon: 'ph:receipt-duotone',
    tintClass: 'bg-cat-other-subtle',
    fgClass: 'text-cat-other-fg',
    subtleToken: '--cat-other-subtle',
    fgToken: '--cat-other-fg',
    i18nKey: 'categories.other',
  },
};
