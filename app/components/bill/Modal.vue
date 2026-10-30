<script lang="ts" setup>
import type { House, BillPeriod, CreateBillPayload, Currency } from '~/types';
import { focusFirstInvalid } from '~/utils/focusFirstInvalid';

interface BillModalProps {
  show: boolean;
  currentHouse: House | null;
}

interface BillModalEvents {
  close: [];
  submit: [payload: CreateBillPayload];
}

const { show, currentHouse = null } = defineProps<BillModalProps>();
const emit = defineEmits<BillModalEvents>();

const { t } = useI18n();
const { getCurrencySymbol } = useCurrency();
const symbol = computed(() =>
  getCurrencySymbol((currentHouse?.currency ?? 'EUR') as Currency),
);

const PERIODS: readonly BillPeriod[] = [1, 2, 6, 12];
const periodLabelId = useId();

const loading = ref(false);

const emptyForm = () => ({
  description: '',
  monthly_cost: '',
  next_due_date: '',
  payment_period: 1 as BillPeriod,
});

const form = ref(emptyForm());
const errors = ref<
  Partial<Record<'description' | 'cost' | 'nextDueDate', string>>
>({});

const {
  categories,
  setCategories,
  reset: resetCategories,
} = useGuessedCategories(() => form.value.description);

// A new bill starts today or later; editing keeps any date (see EditModal).
const minDate = new Date().toISOString().split('T')[0];

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

const reset = () => {
  form.value = emptyForm();
  resetCategories();
  errors.value = {};
};

const handleSubmit = () => {
  if (loading.value || !currentHouse) return;
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
      currency: currentHouse.currency,
      categories: categories.value,
    });
    // The parent closes the modal on success; closing resets the form.
  } finally {
    loading.value = false;
  }
};

// A failed create keeps the modal open with the input intact; reset on close.
watch(
  () => show,
  (isShown) => {
    if (!isShown) reset();
  },
);
</script>

<template>
  <UiModal
    :show="show"
    as="form"
    novalidate
    :title="$t('bills.addBill')"
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

      <ExpenseCategoryCombobox
        :model-value="categories"
        :disabled="loading"
        @update:model-value="setCategories"
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
        :min="minDate"
        :error="!!errors.nextDueDate"
        :hint="errors.nextDueDate"
        required
        :disabled="loading"
      />
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
        {{ $t('bills.form.createBill') }}
      </UiButton>
    </template>
  </UiModal>
</template>
