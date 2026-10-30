<script lang="ts" setup>
definePageMeta({
  layout: false,
});

const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.passwordReset'),
  robots: 'noindex, nofollow',
});

const route = useRoute();
const { confirmReset } = usePasswordReset();

const token = computed(() => (route.query.token as string) || '');
const hasToken = computed(() => !!token.value);

const loading = ref(false);
const tokenInvalid = ref(false);
const success = ref(false);
const networkError = ref('');

const submit = async (password: string) => {
  if (loading.value || !hasToken.value) return;
  loading.value = true;
  networkError.value = '';
  try {
    const result = await confirmReset(token.value, password);

    // No auto-redirect: the success state hands over with its own button.
    if (result.success) {
      success.value = true;
      return;
    }

    if (result.errorType === 'invalid-token') {
      tokenInvalid.value = true;
      return;
    }

    // Never render result.error raw — it can carry an untranslated
    // server/fetch-layer string. Always route through t().
    networkError.value = t('auth.passwordReset.errors.network');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthShell>
    <AuthConfirmStateCard v-if="!hasToken" variant="danger">
      <template #icon><AuthIconAlert :size="32" /></template>
      <h1 class="auth-heading">
        {{ t('auth.passwordReset.missingToken.title') }}
      </h1>
      <p class="confirm-body">
        {{ t('auth.passwordReset.missingToken.message') }}
      </p>
      <div class="confirm-actions">
        <UiLinkButton to="/auth/forgot-password" size="lg" full-width>
          {{ t('auth.passwordReset.missingToken.requestButton') }}
        </UiLinkButton>
      </div>
    </AuthConfirmStateCard>

    <AuthConfirmStateCard v-else-if="tokenInvalid" variant="danger">
      <template #icon><AuthIconAlert :size="32" /></template>
      <h1 class="auth-heading">
        {{ t('auth.passwordReset.invalidToken.title') }}
      </h1>
      <p class="confirm-body">
        {{ t('auth.passwordReset.invalidToken.message') }}
      </p>
      <div class="confirm-actions">
        <UiLinkButton to="/auth/forgot-password" size="lg" full-width>
          {{ t('auth.passwordReset.invalidToken.requestButton') }}
        </UiLinkButton>
        <UiLinkButton to="/auth/login" variant="secondary" size="lg" full-width>
          {{ t('auth.passwordReset.invalidToken.loginButton') }}
        </UiLinkButton>
      </div>
    </AuthConfirmStateCard>

    <AuthConfirmStateCard v-else-if="success" variant="success">
      <template #icon><AuthIconCheck :size="32" /></template>
      <h1 class="auth-heading">
        {{ t('auth.passwordReset.success.title') }}
      </h1>
      <p class="confirm-body">
        {{ t('auth.passwordReset.success.message') }}
      </p>
      <UiLinkButton to="/auth/login?reset=true" size="lg" full-width>
        {{ t('auth.passwordReset.success.button') }}
      </UiLinkButton>
    </AuthConfirmStateCard>

    <template v-else>
      <h1 class="auth-heading">{{ t('auth.passwordReset.title') }}</h1>
      <p class="auth-sub">{{ t('auth.passwordReset.subtitle') }}</p>

      <div
        v-if="networkError"
        id="password-reset-error"
        class="auth-alert auth-alert-error"
        role="alert"
      >
        <AuthIconAlert />
        {{ networkError }}
      </div>

      <AuthNewPasswordForm
        :submit-label="t('auth.passwordReset.button')"
        :loading="loading"
        :error-id="networkError ? 'password-reset-error' : undefined"
        @submit="submit"
      />
    </template>
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
}
</style>
