<script lang="ts" setup>
type FilterValue = 'all' | 'pending' | 'settled';

interface ExpenseFilterBarProps {
  currentFilter: FilterValue;
  searchQuery?: string;
}

const { currentFilter, searchQuery = '' } =
  defineProps<ExpenseFilterBarProps>();

interface ExpenseFilterBarEvents {
  'filter-change': [filter: FilterValue];
  'search-change': [query: string];
}

const emit = defineEmits<ExpenseFilterBarEvents>();

const { t: $t } = useI18n();

const filters: FilterValue[] = ['all', 'pending', 'settled'];
</script>

<template>
  <!-- One row from sm up: search left, filters right, space between. Stacked
       on phones, where the segmented control already needs the full width. -->
  <div
    class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <UiInput
      class="sm:w-72 sm:min-w-0 sm:shrink"
      type="search"
      :model-value="searchQuery"
      :placeholder="$t('expenses.searchPlaceholder')"
      :aria-label="$t('expenses.searchPlaceholder')"
      @update:model-value="emit('search-change', String($event))"
    >
      <template #icon>
        <Icon name="heroicons:magnifying-glass" />
      </template>
    </UiInput>

    <!-- One segmented control for all breakpoints: toggle buttons with
         aria-pressed, all in the Tab order (it filters a list, it is not a
         tab widget with panels). -->
    <div
      class="flex w-full shrink-0 gap-1 rounded-control border border-line bg-surface p-1 sm:w-fit"
      role="group"
      :aria-label="$t('expenses.filterTitle')"
    >
      <button
        v-for="filter in filters"
        :key="filter"
        type="button"
        :aria-pressed="currentFilter === filter"
        :class="[
          'min-h-11 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors md:min-h-9 sm:flex-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          currentFilter === filter
            ? 'bg-brand text-brand-on'
            : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
        ]"
        @click="emit('filter-change', filter)"
      >
        {{ $t('expenses.filter.' + filter) }}
      </button>
    </div>
  </div>
</template>
