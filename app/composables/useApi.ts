import type { ApiResponse } from '~/types';

/**
 * useApi - Wrapper for API calls with automatic loading state management
 *
 * This composable provides a unified way to make API calls with:
 * - Automatic loading indicator management
 * - Consistent error handling
 * - Type-safe responses
 */

export function useApi() {
  const { startLoading, stopLoading } = useLoading();

  /**
   * Execute an API call with automatic loading state management
   *
   * @param apiCall - The API function to execute
   * @param showLoader - Whether to show the global loading indicator (default: false; opt in only for genuinely blocking actions)
   * @returns Promise with ApiResponse
   */
  async function execute<T>(
    apiCall: () => Promise<ApiResponse<T>>,
    showLoader = false,
  ): Promise<ApiResponse<T>> {
    try {
      if (showLoader) {
        startLoading();
      }

      const result = await apiCall();
      return result;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        data: null,
        error: err?.message || 'An unexpected error occurred',
      };
    } finally {
      if (showLoader) {
        stopLoading();
      }
    }
  }

  /**
   * Execute an API call that uses $fetch directly with automatic loading state
   *
   * @param url - The URL to fetch
   * @param options - Fetch options
   * @param showLoader - Whether to show the global loading indicator (default: false; opt in only for genuinely blocking actions)
   * @returns Promise with the response data
   */
  async function fetch<T = unknown>(
    url: string,
    options?: Record<string, unknown>,
    showLoader = false,
  ): Promise<T> {
    try {
      if (showLoader) {
        startLoading();
      }

      const result = await $fetch<T>(url, options);
      return result as T;
    } finally {
      if (showLoader) {
        stopLoading();
      }
    }
  }

  /**
   * Execute multiple API calls in parallel with loading state
   *
   * @param apiCalls - Array of API functions to execute
   * @param showLoader - Whether to show the global loading indicator (default: false; opt in only for genuinely blocking actions)
   * @returns Promise with array of ApiResponse results
   */
  async function executeAll<T>(
    apiCalls: Array<() => Promise<ApiResponse<T>>>,
    showLoader = false,
  ): Promise<Array<ApiResponse<T>>> {
    try {
      if (showLoader) {
        startLoading();
      }

      const results = await Promise.all(apiCalls.map((call) => call()));
      return results;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return apiCalls.map(() => ({
        data: null,
        error: err?.message || 'An unexpected error occurred',
      }));
    } finally {
      if (showLoader) {
        stopLoading();
      }
    }
  }

  return {
    execute,
    fetch,
    executeAll,
  };
}
