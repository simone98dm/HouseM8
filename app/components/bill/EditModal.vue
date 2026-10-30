<script lang="ts" setup>
import type { Bill, BillPeriod, Currency, UpdateBillPayload } from '~/types';
import type { ExpenseCategory } from '~~/shared/constants/categories';
import { categoryGuess } from '~/utils/categoryGuess';
import { focusFirstInvalid } from '~/utils/focusFirstInvalid';

interface BillEditModalProps {
  show: boolean;
  bill: Bill | null;
}

interface BillEditModalEvents {
  close: [];
  submit: [payload: UpdateBillPayload];
}

const { show, bill } = defineProps<BillEditModalProps>();
const emit = defineEmits<BillEditModalEvents>();

const { t } = useI18n();
const { getSupportedCurrencies, getCurrencySymbol } = useCurrency();

const PERIODS: readonly BillPeriod[] = [1, 2, 6, 12];
const periodLabelId = useId();

const loading = ref(false);
const currencyOptions = getSupportedCurrencies().map((option) => ({
  value: option.code,
  label: `${option.name} (${option.symbol})`,
}));

const form = ref({
  description: '',
  monthly_cost: '',
  next_due_date: '',
  active: true,
  currency: 'EUR' as Currency,
  payment_period: 1 as BillPeriod,
  categories: [] as ExpenseCategory[],
});
const errors = ref<
  Partial<Record<'description' | 'cost' | 'nextDueDate', string>>
>({});

const symbol = computed(() => getCurrencySymbol(form.value.currency));

// Populate from the bill each time the modal opens.
watch(
  () => [bill, show] as const,
  ([newBill, newShow]) => {
    if (newShow && newBill) {
      errors.value = {};
      form.value = {
        description: newBill.description || '',
        monthly_cost: newBill.monthly_cost?.toString() || '',
        next_due_date: newBill.next_due_date || '',
        active: newBill.active ?? true,
        currency: (newBill.currency || 'EUR') as Currency,
        payment_period: (newBill.payment_period || 1) as BillPeriod,
        // Show the effective categories: stored ones, else the keyword guess.
        categories: newBill.categories?.length
          ? [...newBill.categories]
          : [categoryGuess(newBill.description)],
      };
    }
  },
  { immediate: true },
);

// No `min` on the due date: an overdue bill must be able to keep its real
// date, and a correction may legitimately move it into the past.
const validate = () => {
  const next: typeof errors.value = {};
  if (!form.value.description.trim())
    next.description = t('bills.form.errors.description');
  if (!(Number.parseFloat(form.value.monthly_cost) > 0))
    next.cost = t('bills.form.errors.cost');
  if (!form.value.next_due_date)
    next.nextDueDate = t('bills.form.errors.nextDueDate');
  errors.value = next;
  return Object.keys(next).length === 0;
};

const handleSubmit = () => {
  if (loading.value) return;
  if (!validate()) {
    focusFirstInvalid();
    return;
  }

  loading.value = true;
  try {
    emit('submit', {
      description: form.value.description.trim(),
      monthly_cost: Number.parseFloat(form.value.monthly_cost),
      payment_period: form.value.payment_period,
      next_due_date: form.value.next_due_date,
      currency: form.value.currency,
      categories: form.value.categories,
      active: form.value.active,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <UiModal
    :show="show"
    as="form"
    novalidate
    :title="$t('bills.edit.title')"
    @close="emit('close')"
    @submit="handleSubmit"
  >
    <div class="space-y-4">
      <UiInput
        v-model="form.description"
        :label="$t('bills.form.description')"
        :placeholder="$t('bills.form.descriptionPlaceholder')"
        :error="!!errors.description"
        :hint="errors.description"
        required
        :disabled="loading"
      />

      <UiInput
        v-model="form.monthly_cost"
        :label="$t('bills.form.costPerPeriod', { currency: symbol })"
        type="number"
        inputmode="decimal"
        step="0.01"
        min="0.01"
        :placeholder="$t('bills.form.costPlaceholder')"
        :error="!!errors.cost"
        :hint="errors.cost"
        required
        :disabled="loading"
      />

      <ExpenseCategoryCombobox v-model="form.categories" :disabled="loading" />

      <UiSelect
        v-model="form.currency"
        :label="$t('currency.label')"
        :options="currencyOptions"
        :hint="$t('currency.description')"
        :disabled="loading"
      />

      <div>
        <span
          :id="periodLabelId"
          class="mb-2 block text-sm font-semibold text-fg"
        >
          {{ $t('bills.form.paymentPeriod') }}
        </span>
        <div
          role="group"
          :aria-labelledby="periodLabelId"
          class="flex flex-wrap gap-2"
        >
          <UiChip
            v-for="period in PERIODS"
            :key="period"
            :label="$t(`bills.periods.${period}`)"
            variant="primary"
            selectable
            :selected="form.payment_period === period"
            @click="form.payment_period = period"
          />
        </div>
      </div>

      <UiInput
        v-model="form.next_due_date"
        :label="$t('bills.form.nextDueDate')"
        type="date"
        :error="!!errors.nextDueDate"
        :hint="errors.nextDueDate"
        required
        :disabled="loading"
      />

      <div>
        <UiSwitch
          v-model="form.active"
          :label="$t('bills.form.active')"
          :disabled="loading"
        />
        <p class="mt-1 text-sm text-fg-muted">
          {{ $t('bills.form.activeDescription') }}
        </p>
      </div>
    </div>

    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        :disabled="loading"
        @click="emit('close')"
      >
        {{ $t('common.cancel') }}
      </UiButton>
      <UiButton type="submit" :loading="loading">
        {{ $t('bills.edit.updateBill') }}
      </UiButton>
    </template>
  </UiModal>
</template>
