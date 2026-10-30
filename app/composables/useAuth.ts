import type { ApiResponse } from '~/types/api';
import type {
  SignInResponse,
  RegisterResponse,
  FetchError,
  ConfirmErrorCode,
} from '~/types/composables/auth';

const statusOf = (error: unknown): number | undefined => {
  const fetchError = error as FetchError | undefined;
  return fetchError?.response?.status ?? fetchError?.statusCode;
};

/**
 * Turns a failed auth request into an i18n key: raw server or fetch-layer
 * strings never reach the UI. No status means the request never got an answer.
 */
const authErrorKey = (
  error: unknown,
  byStatus: Record<number, string>,
  fallback: string,
): string => {
  const status = statusOf(error);
  if (status === undefined) return 'auth.errors.network';
  if (status === 429) return 'auth.errors.tooManyAttempts';
  return byStatus[status] ?? fallback;
};

const confirmErrorCode = (error: unknown): ConfirmErrorCode => {
  const status = statusOf(error);
  if (status === undefined) return 'NETWORK';
  if (status === 409) return 'PASSWORD_REQUIRED';
  if (status === 400) return 'INVALID_TOKEN';
  if (status === 429) return 'RATE_LIMITED';
  return 'FAILED';
};

export const useAuth = () => {
  const userStore = useUserStore();
  const api = useApi();

  /**
   * Sign in with email and password
   */
  const signInWithPassword = async (
    email: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<ApiResponse<SignInResponse>> => {
    try {
      const response = await api.fetch<SignInResponse>('/api/auth/signin', {
        method: 'POST',
        body: { email, password, rememberMe },
      });

      return {
        data: response,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: authErrorKey(
          error,
          {
            401: 'auth.errors.invalidCredentials',
            403: 'auth.errors.emailNotConfirmed',
          },
          'auth.errors.tryAgainLater',
        ),
      };
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.fetch<{ message: string }>(
        '/api/auth/signout',
        {
          method: 'POST',
        },
      );

      // Clear user store
      userStore.reset();

      return {
        data: response,
        error: null,
      };
    } catch (error) {
      const fetchError = error as FetchError;
      return {
        data: null,
        error:
          fetchError?.data?.statusMessage ||
          fetchError?.message ||
          'Sign out failed',
      };
    }
  };

  /**
   * Get current session (for backward compatibility)
   * Note: With JWT-based auth, we don't have traditional sessions
   */
  const getCurrentSession = async (): Promise<
    ApiResponse<{ authenticated: boolean }>
  > => {
    try {
      // Check if user store has a current user
      if (userStore.currentUser) {
        return {
          data: { authenticated: true },
          error: null,
        };
      }

      return {
        data: { authenticated: false },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get session',
      };
    }
  };

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = async (): Promise<ApiResponse<null>> => {
    try {
      // Redirect to Google OAuth endpoint
      // The backend should handle the OAuth flow
      globalThis.location.href = '/api/auth/google';

      // OAuth flow redirects to provider, so we return success
      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Google sign in failed',
      };
    }
  };

  /**
   * Register a new user — email + consent only (passwordless onboarding flow)
   */
  const register = async (
    email: string,
  ): Promise<ApiResponse<RegisterResponse>> => {
    try {
      // Server requires all three confirmations as literal `true` (snake_case).
      const response = await api.fetch<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: {
          email,
          age_confirmed: true,
          terms_accepted: true,
          privacy_acknowledged: true,
        },
      });

      return {
        data: response,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: authErrorKey(
          error,
          {
            400: 'auth.errors.invalidEmail',
            404: 'auth.register.closed.message',
          },
          'auth.errors.tryAgainLater',
        ),
      };
    }
  };

  /**
   * Mail a fresh sign-up link to an unconfirmed account. The server answers
   * the same for every address, so success says nothing about the account.
   */
  const resendConfirmation = async (
    email: string,
  ): Promise<ApiResponse<{ success: boolean }>> => {
    try {
      const response = await api.fetch<{ success: boolean }>(
        '/api/auth/resend-confirmation',
        { method: 'POST', body: { email } },
      );
      return { data: response, error: null };
    } catch (error) {
      return {
        data: null,
        error: authErrorKey(
          error,
          { 400: 'auth.errors.invalidEmail' },
          'auth.errors.resendFailed',
        ),
      };
    }
  };

  /**
   * Confirm a magic-link token — sets auth cookies, user lands on dashboard
   */
  /** A sign-up with no password yet fails with error 'PASSWORD_REQUIRED'. */
  const confirmWithToken = async (
    token: string,
    password?: string,
  ): Promise<{
    data: { success: boolean } | null;
    error: ConfirmErrorCode | null;
  }> => {
    try {
      const response = await api.fetch<{ success: boolean }>(
        '/api/auth/confirm',
        {
          method: 'POST',
          body: { token, password },
        },
      );
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: confirmErrorCode(error) };
    }
  };

  // Legacy method names for backward compatibility
  const signIn = signInWithPassword;

  return {
    user: computed(() => userStore.currentUser),
    signIn,
    signInWithPassword,
    signInWithGoogle,
    signOut,
    getCurrentSession,
    register,
    resendConfirmation,
    confirmWithToken,
  };
};
