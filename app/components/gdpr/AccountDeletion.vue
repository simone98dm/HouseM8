<script setup lang="ts">
import type { OwnedHouse, RequestDeletionError } from '~/composables/useUser';

const GRACE_PERIOD_DAYS = 30;
const CONSEQUENCE_KEYS = [
  'signIn',
  'pseudonymized',
  'sharedRecords',
  'invoices',
  'houses',
  'subscription',
  'restore',
] as const;

interface AccountDeletionProps {
  deletedAt?: string | null;
}

interface AccountDeletionEmits {
  cancelled: [];
  deleted: [];
}

const DELETION_ERROR_KEYS: Record<RequestDeletionError, string> = {
  OWNER_MUST_TRANSFER: 'gdpr.errors.ownerMustTransfer',
  RATE_LIMITED: 'errors.tooManyRequestsMessage',
  BILLING_CANCEL_FAILED: 'gdpr.errors.billingCancelFailed',
  UNKNOWN: 'common.error',
};

const { deletedAt = null } = defineProps<AccountDeletionProps>();
const emit = defineEmits<AccountDeletionEmits>();

const { t } = useI18n();
const { formatLong } = useDate();
const userStore = useUserStore();

const loading = ref(false);
const errorKey = ref('');
const ownedHouses = ref<OwnedHouse[]>([]);
const showConfirm = ref(false);
const cancelNotice = ref('');

const scheduledFor = computed(() => {
  if (!deletedAt) return null;
  const d = new Date(deletedAt);
  d.setDate(d.getDate() + GRACE_PERIOD_DAYS);
  return d;
});

const daysRemaining = computed(() => {
  if (!scheduledFor.value) return 0;
  return Math.max(
    0,
    Math.ceil((scheduledFor.value.getTime() - Date.now()) / 86400000),
  );
});

const formattedDate = computed(() =>
  formatLong(scheduledFor.value, { weekday: false }),
);

function resetErrors() {
  errorKey.value = '';
  ownedHouses.value = [];
}

async function requestDeletion() {
  loading.value = true;
  resetErrors();
  try {
    const { error, houses } = await userStore.requestDeletion();
    showConfirm.value = false;
    if (!error) {
      emit('deleted');
      return;
    }
    ownedHouses.value = houses;
    errorKey.value = DELETION_ERROR_KEYS[error];
  } finally {
    loading.value = false;
  }
}

async function cancelDeletion() {
  loading.value = true;
  resetErrors();
  try {
    const { result, error } = await userStore.cancelDeletion();
    if (error || !result) {
      errorKey.value = 'common.error';
      return;
    }
    cancelNotice.value =
      result.subscription_restored === false
        ? t('gdpr.deletion.cancelledSubscriptionNotRestored')
        : t('gdpr.deletion.cancelled');
    emit('cancelled');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <!-- Persistent live region (survives the pending/not-pending branch swap so
       the cancellation result is announced). -->
  <p
    role="status"
    :class="
      cancelNotice ? 'state-card state-card--success mb-4 text-sm' : 'sr-only'
    "
  >
    {{ cancelNotice }}
  </p>

  <div
    v-if="deletedAt"
    class="state-card state-card--warning"
    role="region"
    :aria-label="t('gdpr.deletePendingTitle')"
  >
    <div class="flex items-start gap-3">
      <Icon
        name="heroicons:clock"
        class="mt-0.5 size-6 shrink-0 text-warn-fg"
        aria-hidden="true"
      />
      <div class="flex-1">
        <p class="font-semibold text-fg">
          {{ t('gdpr.deletePendingTitle') }}
        </p>
        <p class="mt-1 text-sm text-fg-muted">
          {{
            t('gdpr.deletePendingDescription', {
              date: formattedDate,
              days: daysRemaining,
            })
          }}
        </p>
        <p v-if="errorKey" class="mt-2 text-sm text-danger-fg" role="alert">
          {{ t(errorKey) }}
        </p>
        <UiButton
          type="button"
          variant="secondary"
          class="mt-3"
          :disabled="loading"
          :loading="loading"
          :aria-busy="loading"
          @click="cancelDeletion"
        >
          {{ t('gdpr.cancelDeletion') }}
        </UiButton>
      </div>
    </div>
  </div>

  <UiCard v-else>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1 basis-64">
        <h3 class="font-semibold text-fg">{{ t('gdpr.deleteTitle') }}</h3>
        <p id="delete-account-description" class="mt-1 text-sm text-fg-muted">
          {{ t('gdpr.deleteDescription', { days: GRACE_PERIOD_DAYS }) }}
        </p>
      </div>
      <UiButton
        type="button"
        variant="danger"
        :disabled="loading"
        aria-describedby="delete-account-description"
        @click="showConfirm = true"
      >
        {{ t('gdpr.deleteButton') }}
      </UiButton>
    </div>

    <div v-if="errorKey" role="alert" class="mt-4 text-sm text-danger-fg">
      <p>{{ t(errorKey) }}</p>
      <ul v-if="ownedHouses.length" class="mt-2 list-disc space-y-1 pl-5">
        <li v-for="house in ownedHouses" :key="house.id">
          <NuxtLink
            :to="`/house/${house.id}`"
            class="font-medium underline underline-offset-2 hover:no-underline"
          >
            {{ t('gdpr.deletion.transferLink', { name: house.name }) }}
          </NuxtLink>
        </li>
      </ul>
    </div>
  </UiCard>

  <UiModal
    :show="showConfirm"
    :title="t('gdpr.deletion.confirmTitle')"
    role="alertdialog"
    @close="loading ? undefined : (showConfirm = false)"
  >
    <p class="text-sm text-fg-muted">
      {{ t('gdpr.deletion.confirmIntro', { days: GRACE_PERIOD_DAYS }) }}
    </p>
    <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-fg">
      <li v-for="key in CONSEQUENCE_KEYS" :key="key">
        {{
          t(`gdpr.deletion.consequences.${key}`, { days: GRACE_PERIOD_DAYS })
        }}
      </li>
    </ul>
    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        :disabled="loading"
        @click="showConfirm = false"
      >
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton
        type="button"
        variant="danger"
        :disabled="loading"
        :loading="loading"
        @click="requestDeletion"
      >
        {{ t('gdpr.deletion.confirmButton') }}
      </UiButton>
    </template>
  </UiModal>
</template>
