/**
 * useExpenseCardPresentation
 *
 * Derives the presentational state shared by the expense row
 * (share/paid status, formatted dates, category icon + colour) from a
 * single expense for `ExpenseCardRow`.
 *
 * Accepts getters (not raw values) so callers can pass reactive-props
 * destructured bindings straight through without losing reactivity.
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { Expense } from '~/types';
import { CATEGORY_META } from '~/constants/categories';
import { resolveCategory } from '~/utils/categoryGuess';

export function useExpenseCardPresentation(
  expense: MaybeRefOrGetter<Expense>,
  currentUserId: MaybeRefOrGetter<string | undefined>,
) {
  const { formatShort } = useDate();

  const userShare = computed(() =>
    toValue(expense).shares?.find(
      (share) => share.user_id === toValue(currentUserId),
    ),
  );

  const isCreator = computed(
    () => toValue(expense).created_by === toValue(currentUserId),
  );

  const isPaid = computed(() => userShare.value?.is_paid ?? false);

  // Who fronted the money: explicit payer, else whoever created the expense.
  const payerId = computed(() => {
    const e = toValue(expense);
    return e.payer?.id ?? e.payer_id ?? e.created_by;
  });
  const youPaid = computed(
    () => !!toValue(currentUserId) && payerId.value === toValue(currentUserId),
  );

  // What the others still owe you when you paid.
  const owedToYou = computed(() =>
    youPaid.value
      ? (toValue(expense).shares ?? [])
          .filter((s) => !s.is_paid && s.user_id !== toValue(currentUserId))
          .reduce((sum, s) => sum + (s.amount_due ?? 0), 0)
      : 0,
  );

  const formattedDate = computed(() =>
    formatShort(toValue(expense).created_at),
  );

  const formattedDateShort = computed(() =>
    formatShort(toValue(expense).created_at, { year: false }),
  );

  // Stored category wins; the bilingual keyword guess covers legacy rows.
  const expenseCategory = computed(() =>
    resolveCategory(toValue(expense).categories, toValue(expense).description),
  );
  const expenseIconName = computed(
    (): string => CATEGORY_META[expenseCategory.value].icon,
  );

  // Per-category tint + ink (tokens.css --cat-*).
  const iconColourClasses = computed(
    (): string =>
      `${CATEGORY_META[expenseCategory.value].tintClass} ${CATEGORY_META[expenseCategory.value].fgClass}`,
  );

  return {
    userShare,
    isCreator,
    isPaid,
    payerId,
    youPaid,
    owedToYou,
    formattedDate,
    formattedDateShort,
    expenseCategory,
    expenseIconName,
    iconColourClasses,
  };
}
