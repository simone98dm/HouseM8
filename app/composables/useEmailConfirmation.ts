import type { ConfirmErrorCode } from '~/types/composables/auth';

/**
 * Why the page could not confirm. Each one gets its own copy and next steps
 * on /auth/confirm, so a dropped connection is never reported as "expired".
 */
export type ConfirmFailure =
  'missing' | 'invalid' | 'network' | 'rateLimited' | 'failed';

const FAILURE_BY_CODE: Record<
  Exclude<ConfirmErrorCode, 'PASSWORD_REQUIRED'>,
  ConfirmFailure
> = {
  INVALID_TOKEN: 'invalid',
  NETWORK: 'network',
  RATE_LIMITED: 'rateLimited',
  FAILED: 'failed',
};

// Long enough to read the success message, short enough not to wait on.
const REDIRECT_DELAY_MS = 1500;

/**
 * Owns the /auth/confirm page's verification flow: magic-link token
 * verification (POST via useAuth). A new sign-up has no password yet, so the
 * server answers PASSWORD_REQUIRED without using the token; the page then asks
 * for one and `submitPassword` confirms, stores it and signs in at once.
 */
export function useEmailConfirmation() {
  const { t } = useI18n();
  const route = useRoute();
  const auth = useAuth();

  const loading = ref(true);
  const confirmed = ref(false);
  const failure = ref<ConfirmFailure | null>(null);
  const needsPassword = ref(false);
  const savingPassword = ref(false);
  const passwordError = ref('');
  const landingPath = ref('/dashboard');
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;

  onUnmounted(() => {
    if (redirectTimer) clearTimeout(redirectTimer);
  });

  const token = () => (route.query.token as string) || '';

  const onConfirmed = () => {
    needsPassword.value = false;
    confirmed.value = true;
    // Resume what the user was doing at sign-up (e.g. an invite link).
    landingPath.value = takeStashedAuthRedirect() ?? '/dashboard';
    redirectTimer = setTimeout(
      () => navigateTo(landingPath.value),
      REDIRECT_DELAY_MS,
    );
  };

  /**
   * POST /api/auth/confirm {token}: sets auth cookies server-side; on success
   * land on /dashboard where the wizard auto-triggers via is_first_access.
   */
  const verify = async () => {
    loading.value = true;
    failure.value = null;
    try {
      if (!token()) {
        failure.value = 'missing';
        return;
      }
      const { data, error } = await auth.confirmWithToken(token());
      if (error === 'PASSWORD_REQUIRED') {
        needsPassword.value = true;
        return;
      }
      if (error || !data?.success) {
        failure.value = error ? FAILURE_BY_CODE[error] : 'failed';
        return;
      }
      onConfirmed();
    } finally {
      loading.value = false;
    }
  };

  onMounted(verify);

  const submitPassword = async (password: string) => {
    if (savingPassword.value || !token()) return;
    savingPassword.value = true;
    passwordError.value = '';
    try {
      const { data, error } = await auth.confirmWithToken(token(), password);
      if (error === 'INVALID_TOKEN') {
        // A used or expired token can't be retried here: offer a new link.
        needsPassword.value = false;
        failure.value = 'invalid';
        return;
      }
      if (error || !data?.success) {
        // Network or rate limit: keep the form and the typed password.
        passwordError.value =
          error === 'RATE_LIMITED'
            ? t('auth.errors.tooManyAttempts')
            : t('auth.confirmation.setPassword.failed');
        return;
      }
      onConfirmed();
    } finally {
      savingPassword.value = false;
    }
  };

  return {
    loading,
    confirmed,
    failure,
    landingPath,
    needsPassword,
    savingPassword,
    passwordError,
    submitPassword,
    retry: verify,
  };
}
