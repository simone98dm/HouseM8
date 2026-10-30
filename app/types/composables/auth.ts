/**
 * Auth composable types
 */

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
}

export interface SignInResponse {
  user: AuthUser;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

export interface FetchError {
  data?: {
    statusMessage?: string;
  };
  message?: string;
  statusCode?: number;
  response?: { status?: number };
}

/** Why a confirmation link could not be used; the page picks the copy. */
export type ConfirmErrorCode =
  'PASSWORD_REQUIRED' | 'INVALID_TOKEN' | 'RATE_LIMITED' | 'NETWORK' | 'FAILED';
