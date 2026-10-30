/**
 * useExpenseCardPresentation Composable Tests
 *
 * useExpenseCardPresentation calls useDate() -> useI18n() internally, which
 * requires a Vue i18n plugin. We wrap each call in a minimal Vue app with
 * createI18n so the composable runs inside a valid setup context — same
 * pattern as useBillDetails.test.ts / useDate.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { createApp, defineComponent } from 'vue';
import { createI18n } from 'vue-i18n';
import { useExpenseCardPresentation } from '~/composables/useExpenseCardPresentation';
import { createMockExpense, createMockExpenseShare } from '~/tests/utils';

function getPresentation(
  ...args: Parameters<typeof useExpenseCardPresentation>
): ReturnType<typeof useExpenseCardPresentation> {
  let api!: ReturnType<typeof useExpenseCardPresentation>;

  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: {}, it: {} },
  });

  const app = createApp(
    defineComponent({
      setup() {
        api = useExpenseCardPresentation(...args);
        return () => {};
      },
    }),
  );

  app.use(i18n);
  app.mount(document.createElement('div'));

  return api;
}

const USER_ID = 'u-1';
const OTHER_ID = 'u-2';

describe('useExpenseCardPresentation', () => {
  describe('userShare / isCreator / isPaid', () => {
    it('finds the share belonging to currentUserId', () => {
      const share = createMockExpenseShare({
        user_id: USER_ID,
        amount_due: 50,
      });
      const expense = createMockExpense({
        shares: [share],
        created_by: OTHER_ID,
      });
      const { userShare } = getPresentation(expense, USER_ID);
      expect(userShare.value?.user_id).toBe(USER_ID);
    });

    it('userShare is undefined when current user has no share', () => {
      const share = createMockExpenseShare({ user_id: OTHER_ID });
      const expense = createMockExpense({
        shares: [share],
        created_by: OTHER_ID,
      });
      const { userShare } = getPresentation(expense, USER_ID);
      expect(userShare.value).toBeUndefined();
    });

    it('isCreator is true when expense.created_by matches currentUserId', () => {
      const expense = createMockExpense({ created_by: USER_ID, shares: [] });
      const { isCreator } = getPresentation(expense, USER_ID);
      expect(isCreator.value).toBe(true);
    });

    it('isCreator is false otherwise', () => {
      const expense = createMockExpense({ created_by: OTHER_ID, shares: [] });
      const { isCreator } = getPresentation(expense, USER_ID);
      expect(isCreator.value).toBe(false);
    });

    it('isPaid reflects the user share is_paid flag', () => {
      const share = createMockExpenseShare({ user_id: USER_ID, is_paid: true });
      const expense = createMockExpense({
        shares: [share],
        created_by: OTHER_ID,
      });
      const { isPaid } = getPresentation(expense, USER_ID);
      expect(isPaid.value).toBe(true);
    });

    it('isPaid is false when there is no user share', () => {
      const expense = createMockExpense({ shares: [], created_by: OTHER_ID });
      const { isPaid } = getPresentation(expense, USER_ID);
      expect(isPaid.value).toBe(false);
    });
  });

  describe('formattedDate / formattedDateShort', () => {
    it('formats the expense created_at date', () => {
      const expense = createMockExpense({ created_at: '2026-08-13T00:00:00Z' });
      const { formattedDate, formattedDateShort } = getPresentation(
        expense,
        USER_ID,
      );
      expect(formattedDate.value).toContain('2026');
      expect(formattedDateShort.value).not.toContain('2026');
    });
  });

  describe('expenseIconName', () => {
    const cases: [string, string][] = [
      ['spesa groceries', 'ph:shopping-cart-duotone'],
      ['pizza dinner', 'ph:fork-knife-duotone'],
      ['gas bill', 'ph:lightning-duotone'],
      ['acqua', 'ph:lightning-duotone'],
      ['wifi', 'ph:lightning-duotone'],
      ['Netflix', 'ph:film-strip-duotone'],
      ['affitto', 'ph:key-duotone'],
      ['misc expense', 'ph:receipt-duotone'],
    ];

    for (const [desc, icon] of cases) {
      it(`resolves "${desc}" to ${icon}`, () => {
        const expense = createMockExpense({ description: desc });
        const { expenseIconName } = getPresentation(expense, USER_ID);
        expect(expenseIconName.value).toBe(icon);
      });
    }

    it('prefers the stored category over the description guess', () => {
      const expense = createMockExpense({
        description: 'Netflix',
        categories: ['travel'],
      });
      const { expenseIconName } = getPresentation(expense, USER_ID);
      expect(expenseIconName.value).toBe('ph:airplane-tilt-duotone');
    });
  });

  describe('iconColourClasses', () => {
    it('uses the category tint and ink', () => {
      const { iconColourClasses } = getPresentation(
        createMockExpense({ description: 'acqua' }),
        USER_ID,
      );
      expect(iconColourClasses.value).toBe(
        'bg-cat-utilities-subtle text-cat-utilities-fg',
      );
    });
  });
});
