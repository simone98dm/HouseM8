<script lang="ts" setup>
/**
 * ExpenseEditModal — Create / edit expense form in a modal sheet.
 * Reused for both create (no existing expense) and future edit flows.
 */

import type {
  HouseMember,
  User,
  CreateExpensePayload,
  CreateBillPayload,
  Currency,
} from '~/types';

interface ExpenseModalProps {
  show: boolean;
  members?: HouseMember[];
  currentUser?: User | null;
  /** House currency code; drives the symbol in the amount label. */
  currency?: Currency;
}

interface ExpenseModalEvents {
  close: [];
  submit: [payload: CreateExpensePayload];
  'submit-bill': [payload: CreateBillPayload];
}

const {
  show,
  members = [],
  currentUser = null,
  currency = 'EUR',
} = defineProps<ExpenseModalProps>();

const emit = defineEmits<ExpenseModalEvents>();

const { t: $t } = useI18n();
const { getCurrencySymbol } = useCurrency();

const PERIODS = [1, 2, 6, 12] as const;

const loading = ref(false);
const periodLabelId = useId();
const splitLabelId = useId();
const membersErrorId = useId();
const detailsId = useId();
const paidSummaryId = useId();
// Polite live copy of the modal title: the dialog's accessible name changes
// when "Repeats" flips, but a name change is not announced on its own.
const announcement = ref('');

// Collapsed by default: the common case is "I paid, split with everyone".
const detailsOpen = ref(false);

const memberIds = () =>
  members.map((m) => m.user?.id).filter((id): id is string => !!id);

const emptyForm = () => ({
  repeats: false,
  description: '',
  amount: '',
  due_date: '',
  user_ids: memberIds(),
  payer_id: currentUser?.id ?? '',
  period: 1 as (typeof PERIODS)[number],
});

const form = ref(emptyForm());
const {
  categories,
  setCategories,
  reset: resetCategories,
} = useGuessedCategories(() => form.value.description);
const errors = ref<
  Partial<Record<'description' | 'amount' | 'members' | 'dueDate', string>>
>({});

const minDate = new Date().toISOString().split('T')[0];

const symbol = computed(() => getCurrencySymbol(currency));

const payerOptions = computed(() =>
  members
    .filter((m) => m.user?.id)
    .map((m) => ({
      value: m.user!.id,
      label: `${m.user!.first_name} ${m.user!.last_name}`.trim(),
    })),
);

watch(
  () => form.value.repeats,
  (repeats) => {
    announcement.value = repeats
      ? $t('expenses.form.billTitle')
      : $t('expenses.form.title');
  },
);

const payerName = computed(() => {
  if (!form.value.payer_id || form.value.payer_id === currentUser?.id)
    return $t('expenses.form.you');
  return (
    members.find((m) => m.user?.id === form.value.payer_id)?.user?.first_name ??
    ''
  );
});

const splitName = computed(() => {
  const count = form.value.user_ids.length;
  return count === members.length
    ? $t('expenses.form.splitEveryone')
    : $t('expenses.form.splitSome', { count, total: members.length });
});

const toggleUserSelection = (member: HouseMember, checked: boolean) => {
  const userId = member.user?.id ?? '';
  if (checked) {
    if (!form.value.user_ids.includes(userId))
      form.value.user_ids = [...form.value.user_ids, userId];
  } else {
    form.value.user_ids = form.value.user_ids.filter((id) => id !== userId);
  }
};

const validate = () => {
  const next: typeof errors.value = {};
  if (!form.value.description.trim())
    next.description = $t('expenses.form.errors.description');
  if (!(Number.parseFloat(form.value.amount) > 0))
    next.amount = $t('expenses.form.errors.amount');
  if (form.value.repeats) {
    if (!form.value.due_date)
      next.dueDate = $t('expenses.form.errors.nextDueDate');
  } else if (form.value.user_ids.length === 0) {
    next.members = $t('expenses.form.errors.members');
  } else if (
    currentUser &&
    form.value.payer_id !== currentUser.id &&
    !form.value.user_ids.includes(currentUser.id)
  ) {
    // The API rejects a payment made by someone else that leaves you out.
    next.members = $t('expenses.form.errors.includeYou');
  }
  errors.value = next;
  // An error inside the collapsed disclosure must be visible to be fixed.
  if (next.members) detailsOpen.value = true;
  return Object.keys(next).length === 0;
};

const reset = () => {
  form.value = emptyForm();
  resetCategories();
  errors.value = {};
  detailsOpen.value = false;
};

const handleSubmit = () => {
  if (loading.value) return;
  if (!validate()) {
    // WCAG 3.3.1: land on the first invalid field; its error is announced via
    // aria-describedby + role=alert.
    nextTick(() =>
      document
        .querySelector<HTMLElement>(
          '[role="dialog"] [aria-invalid="true"], [role="dialog"] [data-split-error] button',
        )
        ?.focus(),
    );
    return;
  }
  loading.value = true;
  try {
    const amount = Number.parseFloat(form.value.amount);
    if (form.value.repeats) {
      emit('submit-bill', {
        description: form.value.description.trim(),
        monthly_cost: amount,
        payment_period: form.value.period,
        next_due_date: form.value.due_date,
        currency,
        categories: categories.value,
      });
    } else {
      emit('submit', {
        description: form.value.description.trim(),
        total_amount: amount,
        due_date: form.value.due_date || undefined,
        user_ids: form.value.user_ids,
        payer_id: form.value.payer_id || undefined,
        categories: categories.value,
      });
    }
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

// Members and the current user load asynchronously: fill the defaults (all
// members split, current user pays) once they arrive, never over user input.
watch(
  () => members,
  () => {
    if (form.value.user_ids.length === 0) form.value.user_ids = memberIds();
  },
  { immediate: true },
);
watch(
  () => currentUser,
  (user) => {
    if (user && !form.value.payer_id) form.value.payer_id = user.id;
  },
  { immediate: true },
);
</script>

<template>
  <UiModal
    :show="show"
    :title="
      form.repeats ? $t('expenses.form.billTitle') : $t('expenses.form.title')
    "
    as="form"
    novalidate
    @close="$emit('close')"
    @submit="handleSubmit"
  >
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
    <div class="space-y-4">
      <UiInput
        v-model="form.description"
        :label="$t('expenses.form.description')"
        :placeholder="
          form.repeats
            ? $t('expenses.form.billDescriptionPlaceholder')
            : $t('expenses.form.descriptionPlaceholder')
        "
        :error="!!errors.description"
        :hint="errors.description"
        required
        :disabled="loading"
      />

      <UiInput
        v-model="form.amount"
        :label="
          form.repeats
            ? $t('bills.form.costPerPeriod', { currency: symbol })
            : $t('expenses.form.amount', { currency: symbol })
        "
        type="number"
        step="0.01"
        min="0.01"
        :placeholder="$t('expenses.form.amountPlaceholder')"
        :error="!!errors.amount"
        :hint="errors.amount"
        required
        :disabled="loading"
      />

      <ExpenseCategoryCombobox
        :model-value="categories"
        :disabled="loading"
        @update:model-value="setCategories"
      />

      <div v-if="!form.repeats">
        <div class="flex min-h-11 items-center justify-between gap-3">
          <p :id="paidSummaryId" class="min-w-0 text-sm text-fg">
            {{
              $t('expenses.form.paidSummary', {
                payer: payerName,
                split: splitName,
              })
            }}
          </p>
          <UiButton
            type="button"
            variant="ghost"
            size="sm"
            :disabled="loading"
            :aria-expanded="detailsOpen"
            :aria-controls="detailsId"
            :aria-describedby="paidSummaryId"
            @click="detailsOpen = !detailsOpen"
          >
            {{
              detailsOpen
                ? $t('expenses.form.detailsDone')
                : $t('expenses.form.detailsEdit')
            }}
          </UiButton>
        </div>
        <div v-show="detailsOpen" :id="detailsId" class="mt-3 space-y-4">
          <UiSelect
            v-model="form.payer_id"
            :label="$t('expenses.form.paidBy')"
            :options="payerOptions"
            :disabled="loading"
          />

          <div :data-split-error="errors.members ? '' : undefined">
            <span
              :id="splitLabelId"
              class="mb-2 block text-sm font-semibold text-fg"
            >
              {{ $t('expenses.form.splitBetween') }}
            </span>
            <div
              role="group"
              :aria-labelledby="splitLabelId"
              :aria-describedby="errors.members ? membersErrorId : undefined"
              class="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <div
                v-for="member in members"
                :key="member.id"
                class="flex items-center gap-3 rounded-control border border-line p-2.5 transition-colors hover:bg-surface-hover"
              >
                <UiSwitch
                  :model-value="form.user_ids.includes(member.user?.id ?? '')"
                  :disabled="loading"
                  size="md"
                  :aria-label="`${member.user?.first_name} ${member.user?.last_name}`"
                  @update:model-value="toggleUserSelection(member, $event)"
                />
                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-fg">
                    {{ member.user?.first_name }} {{ member.user?.last_name }}
                  </span>
                </div>
              </div>
            </div>
            <p
              v-if="errors.members"
              :id="membersErrorId"
              class="mt-1 text-xs text-danger-fg"
              role="alert"
            >
              {{ errors.members }}
            </p>
          </div>
        </div>
      </div>

      <div>
        <UiSwitch
          v-model="form.repeats"
          :label="$t('expenses.form.repeats')"
          :disabled="loading"
        />
        <p v-if="!form.repeats" class="mt-1 text-sm text-fg-muted">
          {{ $t('expenses.form.repeatsHelper') }}
        </p>
      </div>

      <template v-if="form.repeats">
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
              :selected="form.period === period"
              @click="form.period = period"
            />
          </div>
        </div>

        <UiInput
          v-model="form.due_date"
          :label="$t('bills.form.nextDueDate')"
          type="date"
          :min="minDate"
          required
          :error="!!errors.dueDate"
          :hint="errors.dueDate"
          :disabled="loading"
        />
      </template>
    </div>

    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        :disabled="loading"
        @click="$emit('close')"
      >
        {{ $t('common.cancel') }}
      </UiButton>
      <UiButton type="submit" :loading="loading">
        {{
          form.repeats
            ? $t('bills.form.createBill')
            : $t('expenses.form.createExpense')
        }}
      </UiButton>
    </template>
  </UiModal>
</template>
