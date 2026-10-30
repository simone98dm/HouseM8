<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({ title: () => `${t('gdpr.settingsTitle')} - House M8` });
const { formatShort } = useDate();
const api = useApi();
const route = useRoute();
const consentsStore = useConsentsStore();

const SHARED_FIELD_KEYS = [
  'gender',
  'occupation',
  'languages',
  'pets',
  'contact',
  'pictures',
] as const;

const showWithdrawConfirm = ref(false);
const sharingStatus = ref('');

// The switch mirrors the store; turning it off only opens the confirmation,
// the state flips once the withdrawal succeeded.
const sharingEnabled = computed({
  get: () => consentsStore.hasProfileSharing,
  set: (value: boolean) => {
    if (value) grantSharing();
    else showWithdrawConfirm.value = true;
  },
});

async function grantSharing() {
  sharingStatus.value = '';
  if (await consentsStore.grant('profile_sharing')) {
    sharingStatus.value = t('gdpr.sharing.granted');
  }
}

async function confirmWithdraw() {
  const ok = await consentsStore.withdraw('profile_sharing');
  showWithdrawConfirm.value = false;
  if (ok) sharingStatus.value = t('gdpr.sharing.withdrawn');
}

const { data: meData, refresh } = await useFetch('/api/users/me');
const user = computed(
  () => (meData.value as { data?: Record<string, unknown> } | null)?.data,
);

const deletedAt = computed(
  () => (user.value?.deleted_at as string | null) ?? null,
);
const termsAcceptedAt = computed(
  () => user.value?.terms_accepted_at as string | null,
);
const consentVersion = computed(() => user.value?.consent_version ?? null);

const cancelToken = route.query.cancel_token as string | undefined;
const cancelMessage = ref('');
const cancelFailed = ref(false);

onMounted(async () => {
  consentsStore.loadConsents();
  if (cancelToken) {
    try {
      await api.fetch('/api/gdpr/cancel-delete', {
        method: 'POST',
        body: { token: cancelToken },
      });
      cancelMessage.value = t('gdpr.cancelDeletionDone');
      await refresh();
    } catch {
      cancelFailed.value = true;
      cancelMessage.value = t('gdpr.cancelDeletionFailed');
    }
    await navigateTo('/settings/privacy', { replace: true });
  }
});

function formatDate(iso: string | null | undefined) {
  return formatShort(iso);
}
</script>

<template>
  <AppPageHeader
    :title="t('gdpr.settingsTitle')"
    :meta="t('gdpr.settingsSubtitle')"
  />
  <div class="mx-auto max-w-2xl space-y-8 px-4 py-8">
    <div
      v-if="cancelMessage"
      role="alert"
      :class="[
        'state-card text-sm',
        cancelFailed ? 'state-card--error' : 'state-card--success',
      ]"
    >
      <Icon
        v-if="!cancelFailed"
        name="heroicons:check-circle"
        class="size-5 shrink-0"
        aria-hidden="true"
      />
      {{ cancelMessage }}
    </div>

    <section aria-labelledby="export-section-heading">
      <h2 id="export-section-heading" class="sr-only">
        {{ t('gdpr.exportSection') }}
      </h2>
      <GdprDataExport />
    </section>

    <UiCard as="section" aria-labelledby="docs-section-heading">
      <h2 id="docs-section-heading" class="font-semibold text-fg">
        {{ t('gdpr.docsTitle') }}
      </h2>
      <p class="mt-1 text-sm text-fg-muted">
        {{ t('gdpr.docsDescription') }}
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <UiLinkButton
          to="/privacy"
          target="_blank"
          variant="secondary"
          size="sm"
        >
          {{ t('gdpr.privacyLink') }}
        </UiLinkButton>
        <UiLinkButton to="/terms" target="_blank" variant="secondary" size="sm">
          {{ t('gdpr.termsLink') }}
        </UiLinkButton>
      </div>
    </UiCard>

    <UiCard
      as="section"
      padding="none"
      aria-labelledby="consents-section-heading"
    >
      <template #header>
        <h2
          id="consents-section-heading"
          class="min-w-0 text-base font-semibold text-fg"
        >
          {{ t('gdpr.consentSection') }}
        </h2>
      </template>
      <div class="divide-y divide-line">
        <div class="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p class="text-sm font-medium text-fg">
              {{ t('gdpr.consentPolicyLabel') }}
            </p>
            <p v-if="termsAcceptedAt" class="text-xs text-fg-muted">
              {{
                t('gdpr.consentAcceptedOn', {
                  date: formatDate(termsAcceptedAt),
                  version: consentVersion ?? '—',
                })
              }}
            </p>
            <p v-else class="text-xs text-fg-muted">
              {{ t('gdpr.consentNotAcceptedYet') }}
            </p>
          </div>
          <span v-if="termsAcceptedAt" class="badge badge-success shrink-0">
            {{ t('gdpr.consentAccepted') }}
          </span>
          <span v-else class="badge badge-muted shrink-0">
            {{ t('gdpr.consentPending') }}
          </span>
        </div>

        <div class="px-5 py-4">
          <UiSwitch
            v-model="sharingEnabled"
            :label="t('gdpr.sharing.title')"
            :disabled="consentsStore.isLoading"
          />
          <p class="mt-2 text-sm text-fg-muted">
            {{ t('gdpr.sharing.description') }}
          </p>
          <p class="mt-1 text-xs text-fg-muted">
            {{
              sharingEnabled
                ? t('gdpr.sharing.stateOn')
                : t('gdpr.sharing.stateOff')
            }}
          </p>
          <p
            role="status"
            :class="sharingStatus ? 'mt-2 text-sm text-ok-fg' : 'sr-only'"
          >
            {{ sharingStatus }}
          </p>
        </div>
      </div>
    </UiCard>

    <UiModal
      :show="showWithdrawConfirm"
      :title="t('gdpr.sharing.confirmTitle')"
      @close="showWithdrawConfirm = false"
    >
      <p class="text-sm text-fg-muted">
        {{ t('gdpr.sharing.confirmIntro') }}
      </p>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-fg">
        <li v-for="key in SHARED_FIELD_KEYS" :key="key">
          {{ t(`gdpr.sharing.fields.${key}`) }}
        </li>
      </ul>
      <p class="mt-3 text-sm text-fg-muted">
        {{ t('gdpr.sharing.confirmKept') }}
      </p>
      <template #footer>
        <UiButton
          type="button"
          variant="secondary"
          :disabled="consentsStore.isLoading"
          @click="showWithdrawConfirm = false"
        >
          {{ t('common.cancel') }}
        </UiButton>
        <UiButton
          type="button"
          variant="danger"
          :disabled="consentsStore.isLoading"
          :loading="consentsStore.isLoading"
          @click="confirmWithdraw"
        >
          {{ t('gdpr.sharing.confirmButton') }}
        </UiButton>
      </template>
    </UiModal>

    <section aria-labelledby="danger-section-heading">
      <h2 id="danger-section-heading" class="mb-3 font-semibold text-danger-fg">
        {{ t('gdpr.dangerZone') }}
      </h2>
      <GdprAccountDeletion
        :deleted-at="deletedAt"
        @cancelled="refresh"
        @deleted="navigateTo('/')"
      />
    </section>
  </div>
</template>
