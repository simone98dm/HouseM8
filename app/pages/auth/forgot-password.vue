<script lang="ts" setup>
definePageMeta({
  layout: false,
});

const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.forgotPassword'),
  robots: 'noindex, nofollow',
});

const { requestReset } = usePasswordReset();

const email = ref('');
const loading = ref(false);
const submitted = ref(false);
const error = ref('');

const submit = async () => {
  if (loading.value) return;
  // Validate on submit (DESIGN.md): name and focus the missing field.
  if (!email.value) {
    error.value = t('auth.forgotPassword.emailRequired');
    await nextTick();
    document.getElementById('email')?.focus();
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const result = await requestReset(email.value);
    if (result.error) {
      error.value = t('auth.forgotPassword.errors.network');
      return;
    }
    submitted.value = true;
  } finally {
    loading.value = false;
  }
};

const useDifferentEmail = async () => {
  submitted.value = false;
  await nextTick();
  document.getElementById('email')?.focus();
};
</script>

<template>
  <AuthShell>
    <AuthSuccessState
      v-if="submitted"
      :title="t('auth.forgotPassword.sent.title')"
    >
      <i18n-t keypath="auth.forgotPassword.sent.message" tag="span">
        <template #email>
          <strong class="font-semibold text-fg break-all">{{ email }}</strong>
        </template>
      </i18n-t>
      <template #note>{{ t('auth.forgotPassword.sent.spamHint') }}</template>
      <template #actions>
        <UiLinkButton to="/auth/login" size="lg" full-width>
          {{ t('auth.forgotPassword.sent.button') }}
        </UiLinkButton>
        <UiButton
          variant="ghost"
          size="lg"
          full-width
          @click="useDifferentEmail"
        >
          {{ t('auth.forgotPassword.sent.differentEmail') }}
        </UiButton>
      </template>
    </AuthSuccessState>

    <template v-else>
      <h1 class="auth-heading">{{ t('auth.forgotPassword.title') }}</h1>
      <p class="auth-sub">{{ t('auth.forgotPassword.subtitle') }}</p>

      <div
        v-if="error"
        id="forgot-password-error"
        class="auth-alert auth-alert-error"
        role="alert"
      >
        <AuthIconAlert />
        {{ error }}
      </div>

      <form class="auth-form" novalidate @submit.prevent="submit">
        <UiInput
          id="email"
          v-model="email"
          type="email"
          :label="$t('auth.forgotPassword.email')"
          autocomplete="email"
          required
          :disabled="loading"
          :error="Boolean(error) && !email"
          :aria-describedby="error ? 'forgot-password-error' : undefined"
        >
          <template #icon><AuthIconEmail /></template>
        </UiInput>

        <UiButton type="submit" size="lg" full-width :loading="loading">
          {{
            loading
              ? t('auth.forgotPassword.sending')
              : t('auth.forgotPassword.button')
          }}
        </UiButton>
      </form>
    </template>

    <template v-if="!submitted" #footer-link>
      {{ t('auth.forgotPassword.rememberPassword') }}
      <NuxtLink to="/auth/login">{{
        t('auth.forgotPassword.backToLogin')
      }}</NuxtLink>
    </template>
  </AuthShell>
</template>
