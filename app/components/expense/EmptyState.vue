<script lang="ts" setup>
interface ExpenseEmptyStateProps {
  filter: 'all' | 'pending' | 'settled';
  showAddButton?: boolean;
}

const { filter, showAddButton = true } = defineProps<ExpenseEmptyStateProps>();

interface ExpenseEmptyStateEvents {
  'add-click': [];
}

const emit = defineEmits<ExpenseEmptyStateEvents>();

const { t: $t } = useI18n();

const message = computed(() => {
  if (filter === 'all') return $t('expenses.startByAdding');
  return $t('expenses.noFilteredExpenses', {
    filter: $t(`expenses.filter.${filter}`).toLowerCase(),
  });
});
</script>

<template>
  <UiEmptyState
    icon="heroicons:document-text"
    :title="$t('expenses.noExpensesFound')"
    :description="message"
  >
    <template v-if="filter === 'all' && showAddButton" #action>
      <UiButton @click="emit('add-click')">
        {{ $t('expenses.addExpense') }}
      </UiButton>
    </template>
  </UiEmptyState>
</template>
