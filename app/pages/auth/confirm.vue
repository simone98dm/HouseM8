<script lang="ts" setup>
import type { ConfirmFailure } from '~/composables/useEmailConfirmation';

definePageMeta({
  layout: false,
});

const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.confirmEmail'),
  robots: 'noindex, nofollow',
});

const {
  loading,
  confirmed,
  failure,
  landingPath,
  needsPassword,
  savingPassword,
  passwordError,
  submitPassword,
  retry,
} = useEmailConfirmation();

// A link that no longer works gets a new one; a request that failed in
// transit is retried with the same link.
const RESENDABLE: readonly ConfirmFailure[] = ['missing', 'invalid'];
const canResend = computed(
  () => failure.value !== null && RESENDABLE.includes(failure.value),
);

// One sentence for screen readers per state. Kept out of the swapping cards
// so headings are not re-announced inside a live region.
const announcement = computed(() => {
  if (needsPassword.value) return '';
  if (loading.value) return t('auth.confirmation.processing');
  if (confirmed.value) return t('auth.confirmation.success.title');
  if (failure.value) return t(`auth.confirmation.${failure.value}.title`);
  return '';
});
</script>

<template>
  <AuthShell :card-padding-bottom="40">
    <p class="sr-only" role="status">{{ announcement }}</p>

    <!-- New sign-up: choose the password before the account is confirmed. -->
    <template v-if="needsPassword">
      <h1 class="auth-heading">
        {{ t('auth.confirmation.setPassword.title') }}
      </h1>
      <p class="auth-sub">{{ t('auth.confirmation.setPassword.subtitle') }}</p>

      <div
        v-if="passwordError"
        id="set-password-error"
        class="auth-alert auth-alert-error"
        role="alert"
      >
        <AuthIconAlert />
        {{ passwordError }}
      </div>

      <AuthNewPasswordForm
        :submit-label="t('auth.confirmation.setPassword.button')"
        :password-label="t('auth.confirmation.setPassword.passwordLabel')"
        :loading="savingPassword"
        :error-id="passwordError ? 'set-password-error' : undefined"
        @submit="submitPassword"
      />
    </template>

    <AuthConfirmStateCard v-else-if="loading" variant="pending">
      <template #icon><AuthIconSpinner :size="32" /></template>
      <h1 class="auth-heading">{{ t('auth.confirmation.title') }}</h1>
      <p class="confirm-body">{{ t('auth.confirmation.processing') }}</p>
    </AuthConfirmStateCard>

    <AuthConfirmStateCard v-else-if="confirmed" variant="success">
      <template #icon><AuthIconCheck :size="32" /></template>
      <h1 class="auth-heading">
        {{ t('auth.confirmation.success.title') }}
      </h1>
      <p class="confirm-body">{{ t('auth.confirmation.success.message') }}</p>
      <UiLinkButton :to="landingPath" size="lg" full-width>
        {{ t('auth.confirmation.success.button') }}
      </UiLinkButton>
    </AuthConfirmStateCard>

    <AuthConfirmStateCard v-else-if="failure" variant="danger">
      <template #icon><AuthIconAlert :size="32" /></template>
      <h1 class="auth-heading">
        {{ t(`auth.confirmation.${failure}.title`) }}
      </h1>
      <p class="confirm-body">
        {{ t(`auth.confirmation.${failure}.message`) }}
      </p>

      <div class="confirm-actions">
        <AuthResendLinkForm v-if="canResend" />
        <UiButton v-else size="lg" full-width @click="retry">
          {{ t('auth.confirmation.tryAgain') }}
        </UiButton>
        <UiLinkButton to="/auth/login" variant="secondary" size="lg" full-width>
          {{ t('auth.confirmation.signIn') }}
        </UiLinkButton>
      </div>
    </AuthConfirmStateCard>
  </AuthShell>
</template>

<style scoped>
.confirm-body {
  font-size: var(--fs-md);
  color: var(--fg-muted);
  line-height: 1.6;
  margin-bottom: 24px;
  max-width: 34ch;
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  text-align: left;
}
</style>
