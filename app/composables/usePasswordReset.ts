import type { ApiResponse } from '~/types/api';
import type { FetchError } from '~/types/composables/auth';

/**
 * Owns both password-reset calls (request + confirm) shared by
 * /auth/forgot-password and /auth/password-reset.
 *
 * `confirmReset` distinguishes an invalid/expired token (server 400) from a
 * network failure (no response at all) so the page can show two genuinely
 * different states instead of collapsing them into one generic error.
 */

interface StatusFetchError extends FetchError {
  status?: number;
  statusCode?: number;
  response?: { status: number };
}

export type PasswordResetConfirmErrorType = 'invalid-token' | 'network';

export interface PasswordResetConfirmResult {
  success: boolean;
  error: string | null;
  errorType: PasswordResetConfirmErrorType | null;
}

function getStatus(error: StatusFetchError): number | undefined {
  return error.response?.status ?? error.status ?? error.statusCode;
}

export function usePasswordReset() {
  const api = useApi();

  /**
   * The backend always responds 200 to prevent email enumeration, so a
   * thrown error here only ever means the request itself failed to reach
   * the server — never that the account doesn't exist.
   */
  const requestReset = async (
    email: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.fetch<{ success: boolean; message: string }>(
        '/api/auth/password-reset/request',
        { method: 'POST', body: { email } },
      );
      return { data: response, error: null };
    } catch (error) {
      const fetchError = error as StatusFetchError;
      return {
        data: null,
        error: fetchError?.message || 'Request failed',
      };
    }
  };

  const confirmReset = async (
    token: string,
    newPassword: string,
  ): Promise<PasswordResetConfirmResult> => {
    try {
      await api.fetch<{ success: boolean; message: string }>(
        '/api/auth/password-reset/confirm',
        { method: 'POST', body: { token, newPassword } },
      );
      return { success: true, error: null, errorType: null };
    } catch (error) {
      const fetchError = error as StatusFetchError;
      const isInvalidToken = getStatus(fetchError) === 400;
      return {
        success: false,
        error: fetchError?.data?.statusMessage || fetchError?.message || null,
        errorType: isInvalidToken ? 'invalid-token' : 'network',
      };
    }
  };

  return { requestReset, confirmReset };
}
