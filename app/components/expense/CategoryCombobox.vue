<script lang="ts" setup>
/**
 * ExpenseCategoryCombobox — pick up to MAX_EXPENSE_CATEGORIES from the fixed
 * category list. Suggestions filter (debounced) on the translated label,
 * ignoring case and accents; selected categories render as removable chips.
 * WAI-ARIA combobox pattern: focus stays in the input, the active option is
 * announced via aria-activedescendant.
 */
import {
  EXPENSE_CATEGORIES,
  MAX_EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from '~~/shared/constants/categories';
import { CATEGORY_META } from '~/constants/categories';

interface CategoryComboboxProps {
  disabled?: boolean;
}

const { disabled = false } = defineProps<CategoryComboboxProps>();

const model = defineModel<ExpenseCategory[]>({ default: () => [] });

const SUGGEST_DEBOUNCE_MS = 300;

const { t: $t } = useI18n();
const { fieldClasses } = useFieldStyles();

const inputId = useId();
const listboxId = useId();
const hintId = useId();

const query = ref('');
const debouncedQuery = ref('');
const isOpen = ref(false);
const activeIndex = ref(-1);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const isFull = computed(() => model.value.length >= MAX_EXPENSE_CATEGORIES);

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const labelOf = (key: ExpenseCategory) => $t(CATEGORY_META[key].i18nKey);

const suggestions = computed(() => {
  const needle = normalize(debouncedQuery.value);
  return EXPENSE_CATEGORIES.filter(
    (key) =>
      !model.value.includes(key) && normalize(labelOf(key)).includes(needle),
  );
});

const activeOptionId = computed(() =>
  isOpen.value && activeIndex.value >= 0
    ? `${listboxId}-${activeIndex.value}`
    : undefined,
);

const closeList = () => {
  isOpen.value = false;
  activeIndex.value = -1;
};

const applyQuery = () => {
  clearTimeout(debounceTimer);
  debouncedQuery.value = query.value;
  isOpen.value = query.value.trim().length > 0;
  activeIndex.value = suggestions.value.length ? 0 : -1;
};

const onInput = (event: Event) => {
  query.value = (event.target as HTMLInputElement).value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyQuery, SUGGEST_DEBOUNCE_MS);
};

const select = (key: ExpenseCategory) => {
  if (isFull.value || model.value.includes(key)) return;
  model.value = [...model.value, key];
  clearTimeout(debounceTimer);
  query.value = '';
  debouncedQuery.value = '';
  closeList();
};

const inputEl = useTemplateRef<HTMLInputElement>('input');

// The removed chip's button disappears with it; hand focus back to the input
// so keyboard users are not dropped onto <body>.
const remove = async (key: ExpenseCategory) => {
  model.value = model.value.filter((k) => k !== key);
  await nextTick();
  inputEl.value?.focus();
};

const moveActive = (step: 1 | -1) => {
  if (isFull.value) return;
  // Arrows inside the debounce window navigate what was typed, not the old list.
  if (query.value !== debouncedQuery.value) applyQuery();
  // ArrowDown on a closed list opens the full list: keyboard users can browse
  // without typing.
  if (!isOpen.value) {
    debouncedQuery.value = query.value;
    isOpen.value = true;
  }
  const count = suggestions.value.length;
  if (!count) return;
  activeIndex.value = (activeIndex.value + step + count) % count;
};

const onKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
      break;
    case 'Enter': {
      // A fast typist can press Enter inside the debounce window: flush it so
      // "ren⏎" picks Rent instead of being silently dropped.
      if (query.value !== debouncedQuery.value) applyQuery();
      const key = suggestions.value[activeIndex.value];
      // Never let a half-typed category submit the surrounding form.
      if (query.value) event.preventDefault();
      if (isOpen.value && key) select(key);
      break;
    }
    case 'Escape':
      // Close the list first; a second Escape reaches the modal.
      if (isOpen.value) {
        event.stopPropagation();
        closeList();
      }
      break;
    case 'Backspace': {
      const last = model.value.at(-1);
      if (!query.value && last) remove(last);
      break;
    }
  }
};

onBeforeUnmount(() => clearTimeout(debounceTimer));
</script>

<template>
  <div class="space-y-1.5">
    <label :for="inputId" class="block text-sm font-semibold text-fg">
      {{ $t('expenses.form.categories') }}
    </label>

    <div class="relative">
      <input
        :id="inputId"
        ref="input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="isOpen && suggestions.length > 0"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        :aria-describedby="hintId"
        :value="query"
        :placeholder="isFull ? '' : $t('expenses.form.categoriesPlaceholder')"
        :disabled="disabled"
        :readonly="isFull"
        :aria-disabled="isFull || undefined"
        :class="
          fieldClasses({
            size: 'md',
            error: false,
            disabled: disabled || isFull,
          })
        "
        @input="onInput"
        @keydown="onKeydown"
        @blur="closeList"
      />

      <ul
        v-show="isOpen && suggestions.length"
        :id="listboxId"
        role="listbox"
        :aria-label="$t('expenses.form.categories')"
        class="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-control border border-line-control bg-surface-raised py-1 shadow-lg"
      >
        <li
          v-for="(key, index) in suggestions"
          :id="`${listboxId}-${index}`"
          :key="key"
          role="option"
          :aria-selected="index === activeIndex"
          :class="[
            'cursor-pointer px-3 py-2 text-sm',
            index === activeIndex
              ? 'bg-brand-subtle font-semibold text-brand-hover outline-2 -outline-offset-2 outline-brand'
              : 'text-fg',
          ]"
          @mousedown.prevent="select(key)"
          @mousemove="activeIndex = index"
        >
          {{ labelOf(key) }}
        </li>
      </ul>
      <!-- Outside the listbox: it is a message, not an option. -->
      <p
        v-if="isOpen && !suggestions.length"
        class="absolute inset-x-0 top-full z-30 mt-1 rounded-control border border-line-control bg-surface-raised px-3 py-2 text-sm text-fg-muted shadow-lg"
      >
        {{ $t('expenses.form.categoriesNoMatch') }}
      </p>
    </div>

    <p :id="hintId" class="text-xs text-fg-muted">
      {{
        isFull
          ? $t('expenses.form.categoriesFull')
          : $t('expenses.form.categoriesHint')
      }}
    </p>

    <!-- Result count for screen readers; the visual list speaks for itself. -->
    <p class="sr-only" aria-live="polite">
      {{
        isOpen ? $t('expenses.form.categoriesResults', suggestions.length) : ''
      }}
    </p>

    <div v-if="model.length" class="flex flex-wrap gap-2 pt-1">
      <UiChip
        v-for="key in model"
        :key="key"
        :label="labelOf(key)"
        variant="primary"
        size="sm"
        removable
        @remove="remove(key)"
      />
    </div>
  </div>
</template>
