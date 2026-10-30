<script lang="ts" setup>
definePageMeta({
  layout: false,
});

const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.login'),
  robots: 'noindex, nofollow',
});

const route = useRoute();
const userStore = useUserStore();
const auth = useAuth();
const { isEnabled } = useFeatureFlags();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');
// Wrong credentials point at both fields: the server won't say which.
const credentialsRejected = ref(false);

const confirmationSuccess = computed(() => route.query.confirmed === 'true');
const passwordResetSuccess = computed(() => route.query.reset === 'true');

const redirectPath = computed(() => {
  const redirect = route.query.redirect;
  if (isSafeRedirect(redirect) && !redirect.startsWith('/auth/')) {
    return redirect;
  }
  return '/dashboard';
});

// Keep an invite (or any other) redirect when switching to sign-up.
const registerLink = computed(() =>
  redirectPath.value === '/dashboard'
    ? '/auth/register'
    : `/auth/register?redirect=${encodeURIComponent(redirectPath.value)}`,
);

// Validate on submit (DESIGN.md): the button stays enabled and reachable by
// keyboard; a missing field is named and focused instead.
const requireField = async (id: 'email' | 'password', message: string) => {
  credentialsRejected.value = false;
  error.value = message;
  await nextTick();
  document.getElementById(id)?.focus();
};

const signIn = async () => {
  if (loading.value) return;
  if (!email.value) {
    return requireField('email', t('auth.login.emailRequired'));
  }
  if (!password.value) {
    return requireField('password', t('auth.login.passwordRequired'));
  }
  loading.value = true;
  error.value = '';
  credentialsRejected.value = false;
  try {
    const result = await userStore.login(
      email.value,
      password.value,
      rememberMe.value,
    );
    if (result.success) {
      await navigateTo(redirectPath.value, { replace: true });
    } else {
      // The store hands back an i18n key, never a raw server string.
      const key = result.error || 'auth.errors.tryAgainLater';
      credentialsRejected.value = key === 'auth.errors.invalidCredentials';
      error.value = t(key);
    }
  } catch {
    error.value = t('auth.errors.tryAgainLater');
  } finally {
    loading.value = false;
  }
};

const signInWithGoogle = async () => {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    if (redirectPath.value !== '/dashboard') {
      sessionStorage.setItem('auth_redirect', redirectPath.value);
    }
    const response = await auth.signInWithGoogle();
    if (response.error) {
      error.value = t('auth.errors.googleFailed');
      loading.value = false;
    }
  } catch {
    error.value = t('auth.errors.googleFailed');
    loading.value = false;
  }
};
</script>

<template>
  <!-- The Google button below stays raw: AuthShell owns the .btn-google
       variant and it is not on UiButton's scale. -->
  <AuthShell>
    <h1 class="auth-heading">{{ $t('auth.login.title') }}</h1>
    <p class="auth-sub">{{ $t('auth.login.subtitle') }}</p>

    <div
      v-if="confirmationSuccess"
      class="auth-alert auth-alert-success"
      role="status"
    >
      <AuthIconCheck />
      {{ $t('auth.login.emailConfirmed') }}
    </div>

    <div
      v-if="passwordResetSuccess"
      class="auth-alert auth-alert-success"
      role="status"
    >
      <AuthIconCheck />
      {{ $t('auth.login.passwordResetSuccess') }}
    </div>

    <div
      v-if="error"
      id="login-error"
      class="auth-alert auth-alert-error"
      role="alert"
    >
      <AuthIconAlert />
      {{ error }}
    </div>

    <form class="auth-form" novalidate @submit.prevent="signIn">
      <UiInput
        id="email"
        v-model="email"
        type="email"
        :label="$t('auth.login.email')"
        autocomplete="email"
        required
        :disabled="loading"
        :error="credentialsRejected || (Boolean(error) && !email)"
        :aria-describedby="error ? 'login-error' : undefined"
      >
        <template #icon><AuthIconEmail /></template>
      </UiInput>

      <UiInput
        id="password"
        v-model="password"
        type="password"
        :label="$t('auth.login.password')"
        autocomplete="current-password"
        required
        :disabled="loading"
        :error="credentialsRejected || (Boolean(error) && !password)"
        :aria-describedby="error ? 'login-error' : undefined"
      >
        <template #icon><AuthIconLock /></template>
      </UiInput>

      <!-- After the field, not in its label row, so Tab goes email → password. -->
      <div class="auth-options">
        <UiCheckbox v-model="rememberMe" :label="$t('auth.login.rememberMe')" />
        <NuxtLink to="/auth/forgot-password" class="auth-forgot-link">{{
          $t('auth.login.forgotPassword')
        }}</NuxtLink>
      </div>

      <UiButton type="submit" size="lg" full-width :loading="loading">
        {{ loading ? $t('auth.login.signingIn') : $t('auth.login.button') }}
      </UiButton>

      <template v-if="isEnabled('showSignup')">
        <div class="auth-divider">{{ $t('auth.login.orContinueWith') }}</div>

        <button
          type="button"
          class="btn-google"
          :disabled="loading"
          @click="signInWithGoogle"
        >
          <AuthIconGoogleLogo />
          {{ $t('auth.login.googleButton') }}
        </button>
      </template>
    </form>

    <template v-if="isEnabled('showSignup')" #footer-link>
      {{ $t('auth.login.noAccount') }}
      <NuxtLink :to="registerLink">{{ $t('auth.login.signUp') }}</NuxtLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.auth-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
}

/* 44px tall tap target; the text stays body-sized. */
.auth-forgot-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: var(--fs-base);
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--radius-control);
}
.auth-forgot-link:hover {
  text-decoration: underline;
}
.auth-forgot-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
