/**
 * useGuessedCategories
 *
 * Category selection for a create form: pre-fills the keyword guess from the
 * description until the user edits the categories themselves.
 */
import { ref, watch, type MaybeRefOrGetter, toValue } from 'vue';
import type { ExpenseCategory } from '~~/shared/constants/categories';
import { categoryGuess } from '~/utils/categoryGuess';

export function useGuessedCategories(description: MaybeRefOrGetter<string>) {
  const categories = ref<ExpenseCategory[]>([]);
  const touched = ref(false);

  const setCategories = (value: ExpenseCategory[]) => {
    touched.value = true;
    categories.value = value;
  };

  const reset = () => {
    categories.value = [];
    touched.value = false;
  };

  watch(
    () => toValue(description),
    (text) => {
      if (touched.value) return;
      categories.value = text.trim() ? [categoryGuess(text)] : [];
    },
  );

  return { categories, setCategories, reset };
}
