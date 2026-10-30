<script lang="ts" setup>
/**
 * HouseKeyFacts - The facts about the house, always visible (no disclosure).
 * The owner edits them in place; everyone else reads. Replaces the old
 * edit modal.
 */
import type { Currency, House } from '~/types';
import { MAX_HOUSE_MEMBERS, MIN_HOUSE_MEMBERS } from '~/constants';
import { focusFirstInvalid } from '~/utils/focusFirstInvalid';

interface HouseKeyFactsPayload {
  name: string;
  address?: string;
  currency: string;
  max_members?: number;
}

interface HouseKeyFactsProps {
  house: House;
  isOwner?: boolean;
  ownerName?: string;
  ownerId?: string;
  /** People in the house now: the maximum can't go below it. */
  activeCount?: number;
  /** Save failure, shown inside the form so nothing typed is lost. */
  error?: string;
  /** Resolves true when saved; the form then closes. */
  save: (payload: HouseKeyFactsPayload) => Promise<boolean>;
}

const {
  house,
  isOwner = false,
  ownerName = '',
  ownerId = undefined,
  activeCount = 0,
  error = '',
  save,
} = defineProps<HouseKeyFactsProps>();

const { t } = useI18n();
const { getCurrencyName, getSupportedCurrencies } = useCurrency();
const { formatLong } = useDate();

const currencyOptions = getSupportedCurrencies().map((option) => ({
  value: option.code,
  label: `${option.name} (${option.symbol})`,
}));

const form = ref({
  name: '',
  address: '',
  currency: 'EUR' as string,
  memberCount: MIN_HOUSE_MEMBERS as number,
});
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
  else if (count < activeCount)
    next.memberCount = t('houseProfile.capacityBelowMembers', {
      count: activeCount,
    });
  errors.value = next;
  return Object.keys(next).length === 0;
};

const {
  editing,
  saving,
  submitted,
  editButton,
  formRoot,
  start,
  stop,
  submit,
} = useHouseInlineEdit(async () => {
  if (!validate()) {
    focusFirstInvalid();
    return false;
  }
  return save({
    name: form.value.name.trim(),
    // '' clears the address on the server.
    address: form.value.address.trim(),
    currency: form.value.currency,
    max_members: Number(form.value.memberCount),
  });
});

const startEdit = () => {
  errors.value = {};
  form.value = {
    name: house.name,
    address: house.address || '',
    currency: house.currency,
    memberCount: house.max_members ?? MIN_HOUSE_MEMBERS,
  };
  return start();
};

const headingId = useId();
</script>

<template>
  <UiCard as="section" :aria-labelledby="headingId">
    <template #header>
      <h2 :id="headingId" class="min-w-0 text-base font-semibold text-fg">
        {{ t('houseProfile.keyFacts.title') }}
      </h2>
    </template>
    <template v-if="isOwner && !editing" #actions>
      <UiButton
        ref="editButton"
        variant="secondary"
        size="sm"
        icon="pencil"
        :aria-describedby="headingId"
        @click="startEdit"
      >
        {{ t('houseProfile.edit') }}
      </UiButton>
    </template>

    <form
      v-if="editing"
      ref="formRoot"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      novalidate
      @submit.prevent="submit"
    >
      <p
        v-if="error && submitted"
        class="text-sm text-danger-fg sm:col-span-2"
        role="alert"
      >
        {{ error }}
      </p>
      <UiInput
        v-model="form.name"
        class="sm:col-span-2"
        :label="t('houseProfile.houseName')"
        :error="!!errors.name"
        :hint="errors.name"
        required
      />
      <UiInput
        v-model="form.address"
        class="sm:col-span-2"
        :label="t('house.create.address')"
        autocomplete="street-address"
      />
      <UiSelect
        v-model="form.currency"
        :label="t('currency.label')"
        :options="currencyOptions"
        :hint="t('currency.description')"
        required
      />
      <UiInput
        v-model.number="form.memberCount"
        :label="t('houseProfile.memberCount')"
        type="number"
        inputmode="numeric"
        :min="MIN_HOUSE_MEMBERS"
        :max="MAX_HOUSE_MEMBERS"
        :error="!!errors.memberCount"
        :hint="errors.memberCount"
      />
      <div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
        <UiButton type="button" variant="secondary" @click="stop">
          {{ t('common.cancel') }}
        </UiButton>
        <UiButton type="submit" :loading="saving">
          {{ t('houseProfile.save') }}
        </UiButton>
      </div>
    </form>

    <dl v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.location') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-fg">
          {{ house.address || t('houseProfile.notProvided') }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.currency') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-fg">
          {{ getCurrencyName(house.currency as Currency) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.keyFacts.members') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-fg">
          {{
            t('houseProfile.keyFacts.membersValue', {
              taken: activeCount,
              max: house.max_members ?? t('houseProfile.notProvided'),
            })
          }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.owner') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-fg">
          <NuxtLink
            v-if="ownerId && ownerName"
            :to="`/user/${ownerId}`"
            class="rounded-control text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {{ ownerName }}
          </NuxtLink>
          <template v-else>{{ t('houseProfile.notProvided') }}</template>
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.keyFacts.created') }}
        </dt>
        <dd class="mt-1 text-sm font-medium text-fg">
          {{ formatLong(house.created_at) }}
        </dd>
      </div>
    </dl>
  </UiCard>
</template>
