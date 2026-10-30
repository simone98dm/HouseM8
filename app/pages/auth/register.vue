<script lang="ts" setup>
definePageMeta({
  layout: false,
});

const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.register'),
  robots: 'noindex, nofollow',
});

const route = useRoute();
const userStore = useUserStore();
const auth = useAuth();
// The Google button below stays raw: AuthShell owns the .btn-google variant
// and it is not on UiButton's scale (see login.vue).
const { isEnabled } = useFeatureFlags();

const email = ref('');
const consent = ref({
  age_confirmed: false,
  terms_accepted: false,
  privacy_acknowledged: false,
});
const loading = ref(false);
const error = ref('');
const registrationSuccess = ref(false);
const showConsentErrors = ref(false);
const checkboxesRef = ref<{ focusFirstInvalid: () => void } | null>(null);

const redirectPath = computed(() => {
  const redirect = route.query.redirect;
  if (isSafeRedirect(redirect) && !redirect.startsWith('/auth/')) {
    return redirect;
  }
  return '/dashboard';
});

// Keep an invite (or any other) redirect when switching to sign-in.
const loginLink = computed(() =>
  redirectPath.value === '/dashboard'
    ? '/auth/login'
    : `/auth/login?redirect=${encodeURIComponent(redirectPath.value)}`,
);

const isConsentComplete = computed(
  () =>
    consent.value.age_confirmed &&
    consent.value.terms_accepted &&
    consent.value.privacy_acknowledged,
);

const signUp = async () => {
  if (loading.value) return;
  if (!email.value) {
    error.value = t('auth.signUp.emailRequired');
    await nextTick();
    document.getElementById('email')?.focus();
    return;
  }
  if (!isConsentComplete.value) {
    showConsentErrors.value = true;
    error.value = t('auth.signUp.consentIncomplete');
    await nextTick();
    checkboxesRef.value?.focusFirstInvalid?.();
    return;
  }
  showConsentErrors.value = false;
  loading.value = true;
  error.value = '';
  try {
    const result = await userStore.register(email.value);
    if (result.success) {
      // The confirmation link opens a new tab and signs the user in there;
      // remember where they were headed (e.g. the invite they came from).
      if (redirectPath.value !== '/dashboard') {
        stashAuthRedirect(redirectPath.value);
      }
      registrationSuccess.value = true;
    } else {
      // The store hands back an i18n key, never a raw server string.
      error.value = t(result.message || 'auth.errors.tryAgainLater');
    }
  } catch {
    error.value = t('auth.errors.tryAgainLater');
  } finally {
    loading.value = false;
  }
};

const signUpWithGoogle = async () => {
  // Google users accept age/terms/privacy in the consent dialog after sign-in.
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

// Back to the form with the address kept, to fix a typo or use another one.
const useDifferentEmail = async () => {
  registrationSuccess.value = false;
  await nextTick();
  document.getElementById('email')?.focus();
};

onMounted(() => {
  if (userStore.currentUser) navigateTo('/dashboard');
});
</script>

<template>
  <AuthShell :card-max-width="440">
    <template v-if="!isEnabled('showSignup')">
      <h1 class="auth-heading">{{ t('auth.register.closed.title') }}</h1>
      <p class="auth-sub">{{ t('auth.register.closed.message') }}</p>
      <div class="auth-form">
        <UiLinkButton to="/auth/login" size="lg" full-width>
          {{ t('auth.register.closed.button') }}
        </UiLinkButton>
      </div>
    </template>

    <!-- The account has no password until the link is opened, so there is
         no "sign in" here: only ways to get the link. -->
    <AuthSuccessState
      v-else-if="registrationSuccess"
      :title="t('auth.register.emailSent.title')"
    >
      <i18n-t keypath="auth.register.emailSent.message" tag="span">
        <template #email>
          <strong class="font-semibold text-fg break-all">{{ email }}</strong>
        </template>
      </i18n-t>
      <template #note>{{ t('auth.register.emailSent.spamHint') }}</template>
      <template #actions>
        <AuthResendLinkForm :email="email" />
        <UiButton
          variant="ghost"
          size="lg"
          full-width
          @click="useDifferentEmail"
        >
          {{ t('auth.register.emailSent.differentEmail') }}
        </UiButton>
      </template>
    </AuthSuccessState>

    <template v-else>
      <h1 class="auth-heading">{{ t('auth.signUp.title') }}</h1>
      <p class="auth-sub">{{ t('auth.signUp.subtitle') }}</p>

      <div
        v-if="error"
        id="register-error"
        class="auth-alert auth-alert-error"
        role="alert"
      >
        <AuthIconAlert />
        {{ error }}
      </div>

      <form class="auth-form" novalidate @submit.prevent="signUp">
        <UiInput
          id="email"
          v-model="email"
          type="email"
          :label="$t('auth.signUp.email')"
          autocomplete="email"
          required
          :disabled="loading"
          :error="Boolean(error) && !email"
          :aria-describedby="error ? 'register-error' : undefined"
        >
          <template #icon><AuthIconEmail /></template>
        </UiInput>

        <GdprConsentCheckbox
          ref="checkboxesRef"
          v-model="consent"
          id-prefix="register"
          :show-errors="showConsentErrors"
          error-id="register-error"
        />

        <UiButton type="submit" size="lg" full-width :loading="loading">
          {{ loading ? t('auth.signUp.sending') : t('auth.signUp.button') }}
        </UiButton>

        <template v-if="isEnabled('showSignup')">
          <div class="auth-divider">
            {{ $t('auth.signUp.orContinueWith') }}
          </div>

          <button
            type="button"
            class="btn-google"
            :disabled="loading"
            :aria-disabled="loading"
            aria-describedby="google-consent-hint"
            :aria-label="$t('a11y.buttons.signUpWithGoogle')"
            @click="signUpWithGoogle"
          >
            <AuthIconGoogleLogo />
            {{ $t('auth.signUp.googleButton') }}
          </button>
          <p id="google-consent-hint" class="auth-sub auth-note">
            {{ t('auth.signUp.googleConsentNote') }}
          </p>
        </template>
      </form>
    </template>

    <template
      v-if="isEnabled('showSignup') && !registrationSuccess"
      #footer-link
    >
      {{ t('auth.signUp.hasAccount') }}
      <NuxtLink :to="loginLink">{{ t('auth.signUp.signIn') }}</NuxtLink>
    </template>
  </AuthShell>
</template>
