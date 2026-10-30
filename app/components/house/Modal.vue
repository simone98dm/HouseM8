<script lang="ts" setup>
import { MAX_HOUSE_MEMBERS, MIN_HOUSE_MEMBERS } from '~/constants';
import type { House } from '~/types';
import { focusFirstInvalid } from '~/utils/focusFirstInvalid';

interface HouseModalProps {
  show: boolean;
}

interface HouseModalEvents {
  close: [];
  submit: [payload: Partial<House>];
}

const { show } = defineProps<HouseModalProps>();
const emit = defineEmits<HouseModalEvents>();

const { getSupportedCurrencies, DEFAULT_CURRENCY } = useCurrency();
const { t } = useI18n();

const currencyOptions = getSupportedCurrencies().map((option) => ({
  value: option.code,
  label: `${option.name} (${option.symbol})`,
}));

const emptyForm = () => ({
  name: '',
  address: '',
  currency: DEFAULT_CURRENCY as string,
  memberCount: MIN_HOUSE_MEMBERS,
});

const form = ref(emptyForm());
const errors = ref<Partial<Record<'name' | 'memberCount', string>>>({});

const validate = () => {
  const next: typeof errors.value = {};
  if (!form.value.name.trim()) next.name = t('house.create.errors.name');
  const count = Number(form.value.memberCount);
  if (
    !Number.isInteger(count) ||
    count < MIN_HOUSE_MEMBERS ||
    count > MAX_HOUSE_MEMBERS
  )
    next.memberCount = t('house.create.errors.memberCount', {
      min: MIN_HOUSE_MEMBERS,
      max: MAX_HOUSE_MEMBERS,
    });
  errors.value = next;
  return Object.keys(next).length === 0;
};

const handleSubmit = () => {
  if (!validate()) {
    focusFirstInvalid();
    return;
  }
  emit('submit', {
    name: form.value.name.trim(),
    address: form.value.address.trim() || undefined,
    currency: form.value.currency,
    max_members: Number(form.value.memberCount),
  });
  // The parent closes the modal on success; closing resets the form.
};

watch(
  () => show,
  (isShown) => {
    if (!isShown) {
      form.value = emptyForm();
      errors.value = {};
    }
  },
);
</script>

<template>
  <UiModal
    :show="show"
    as="form"
    novalidate
    :title="$t('house.create.title')"
    @close="emit('close')"
    @submit="handleSubmit"
  >
    <div class="space-y-4">
      <UiInput
        v-model="form.name"
        :label="$t('house.create.name')"
        :placeholder="$t('house.create.namePlaceholder')"
        :error="!!errors.name"
        :hint="errors.name"
        required
      />

      <UiInput
        v-model="form.address"
        :label="$t('house.create.address')"
        :placeholder="$t('house.create.addressPlaceholder')"
        autocomplete="street-address"
      />

      <UiSelect
        v-model="form.currency"
        :label="$t('currency.label')"
        :options="currencyOptions"
        :hint="$t('currency.description')"
        required
      />

      <UiInput
        v-model.number="form.memberCount"
        :label="$t('houseProfile.memberCount')"
        type="number"
        inputmode="numeric"
        :min="MIN_HOUSE_MEMBERS"
        :max="MAX_HOUSE_MEMBERS"
        :error="!!errors.memberCount"
        :hint="errors.memberCount"
      />
    </div>

    <template #footer>
      <UiButton type="button" variant="secondary" @click="emit('close')">
        {{ $t('common.cancel') }}
      </UiButton>
      <UiButton type="submit">
        {{ $t('house.create.cta') }}
      </UiButton>
    </template>
  </UiModal>
</template>
