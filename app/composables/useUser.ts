import type { User, ApiResponse, PendingSummary } from '~/types';
import { EXPORT_RATE_LIMITED } from '~/utils/download';

export interface CancelDeletionResult {
  restored_house_ids: string[];
  /** null = nothing to restore; false = could not be resumed. */
  subscription_restored: boolean | null;
}

/** `error` value of cancelDeletion when nothing was scheduled (HTTP 404). */
export const ALREADY_CANCELLED = 'ALREADY_CANCELLED';

export interface DataExportFile {
  blob: Blob;
  filename: string;
}

export type RequestDeletionError =
  'OWNER_MUST_TRANSFER' | 'BILLING_CANCEL_FAILED' | 'RATE_LIMITED' | 'UNKNOWN';

export interface OwnedHouse {
  id: string;
  name: string;
}

export interface RequestDeletionResult {
  error: RequestDeletionError | null;
  /** Houses the user must transfer first (OWNER_MUST_TRANSFER only). */
  houses: OwnedHouse[];
}

interface DeletionApiError {
  statusCode?: number;
  statusMessage?: string;
  data?: { statusMessage?: string; data?: { houses?: OwnedHouse[] } };
}

const filenameFromDisposition = (header: string | null): string | null =>
  /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? '')?.[1] ?? null;

/**
 * Composable to provide user functionality
 *
 * Provides methods for user operations.
 */
export const useUser = () => {
  const api = useApi();
  const baseUrl = '/api/users';

  /**
   * Get current user profile
   */
  const getCurrentUser = async (): Promise<ApiResponse<User>> => {
    try {
      const result = await api.fetch<{ data: User }>(
        `${baseUrl}/me`,
        {},
        false,
      );
      return { data: result.data, error: null };
    } catch (error: unknown) {
      // Handle 503 (service unavailable) as a timing issue
      const err = error as {
        response?: { status?: number };
        status?: number;
        data?: { message?: string };
        message?: string;
      };

      if (err?.response?.status === 503 || err?.status === 503) {
        return {
          data: null,
          error: 'Authentication session not ready - please retry',
        };
      }

      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch user',
      };
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (
    updates: Partial<
      Pick<
        User,
        | 'first_name'
        | 'last_name'
        | 'email'
        | 'preferred_currency'
        | 'avatar_url'
        | 'bio'
        | 'gender'
        | 'occupation_type'
        | 'study_field'
        | 'job_title'
        | 'languages'
        | 'pets'
        | 'telephone'
        | 'instagram'
        | 'twitter'
        | 'tiktok'
        | 'linkedin'
        | 'profile_pictures'
      >
    >,
  ): Promise<ApiResponse<User>> => {
    try {
      const result = await api.fetch<{ data: User }>(
        `${baseUrl}/me`,
        {
          method: 'PUT',
          body: updates,
        },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as {
        statusCode?: number;
        status?: number;
        data?: { message?: string };
        message?: string;
      };
      // 409 is the one failure the user can actually act on: the address they
      // typed belongs to another account. Surface it as a translatable key so
      // they aren't told "an error occurred" and left guessing.
      if (err?.statusCode === 409 || err?.status === 409) {
        return { data: null, error: 'profile.personal.emailTaken' };
      }
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to update profile',
      };
    }
  };

  /**
   * Get user by ID
   */
  const getUserById = async (userId: string): Promise<ApiResponse<User>> => {
    try {
      const result = await api.fetch<{ data: User }>(
        `${baseUrl}/${userId}`,
        {},
        false,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch user',
      };
    }
  };

  /**
   * Cancel the account deletion scheduled during the grace period.
   */
  const cancelDeletion = async (): Promise<
    ApiResponse<CancelDeletionResult>
  > => {
    try {
      const result = await api.fetch<{ data: CancelDeletionResult }>(
        '/api/gdpr/cancel-delete',
        { method: 'POST', body: {} },
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as {
        statusCode?: number;
        status?: number;
        data?: { message?: string };
        message?: string;
      };
      // 404 = nothing scheduled, i.e. already cancelled: decided on status,
      // never on message text.
      if (err?.statusCode === 404 || err?.status === 404) {
        return { data: null, error: ALREADY_CANCELLED };
      }
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to cancel',
      };
    }
  };

  /**
   * Per-house net balances the user leaves behind, shown while deletion is
   * pending.
   */
  const getPendingSummary = async (): Promise<ApiResponse<PendingSummary>> => {
    try {
      const result = await api.fetch<{ data: PendingSummary }>(
        '/api/gdpr/pending-summary',
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to load summary',
      };
    }
  };

  /**
   * Schedule account deletion. Maps known API failures to a typed code
   * instead of throwing.
   */
  const requestDeletion = async (): Promise<RequestDeletionResult> => {
    try {
      await api.fetch('/api/gdpr/delete-account', {
        method: 'POST',
        body: { confirm: true },
      });
      return { error: null, houses: [] };
    } catch (e) {
      const err = e as DeletionApiError;
      const code = err.statusMessage ?? err.data?.statusMessage;
      if (code === 'OWNER_MUST_TRANSFER') {
        return {
          error: code,
          houses: err.data?.data?.houses ?? [],
        };
      }
      if (err.statusCode === 429) return { error: 'RATE_LIMITED', houses: [] };
      if (code === 'BILLING_CANCEL_FAILED') {
        return { error: code, houses: [] };
      }
      return { error: 'UNKNOWN', houses: [] };
    }
  };

  /**
   * Download the GDPR export. Plain fetch (not $fetch) because the filename
   * lives in the Content-Disposition header.
   */
  const exportData = async (): Promise<ApiResponse<DataExportFile>> => {
    try {
      const response = await fetch('/api/gdpr/export', {
        credentials: 'same-origin',
      });
      if (response.status === 429) {
        return { data: null, error: EXPORT_RATE_LIMITED };
      }
      if (!response.ok) throw new Error(`Export failed (${response.status})`);
      const filename =
        filenameFromDisposition(response.headers.get('content-disposition')) ??
        `house-m8-export-${new Date().toISOString().slice(0, 10)}.json`;
      return { data: { blob: await response.blob(), filename }, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  };

  return {
    cancelDeletion,
    getPendingSummary,
    requestDeletion,
    exportData,
    getCurrentUser,
    updateProfile,
    getUserById,
  };
};
