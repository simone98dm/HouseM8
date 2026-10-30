/**
 * useLoading - Global loading state management
 *
 * This composable manages a global loading state that can be used
 * to show/hide loading indicators across the application.
 */

const loadingState = ref<{
  isLoading: boolean;
  activeRequests: number;
}>({
  isLoading: false,
  activeRequests: 0,
});

export function useLoading() {
  /**
   * Start loading - increments active request counter
   */
  const startLoading = () => {
    loadingState.value.activeRequests++;
    loadingState.value.isLoading = true;
  };

  /**
   * Stop loading - decrements active request counter
   * Only stops loading when all requests are complete
   */
  const stopLoading = () => {
    if (loadingState.value.activeRequests > 0) {
      loadingState.value.activeRequests--;
    }

    if (loadingState.value.activeRequests === 0) {
      loadingState.value.isLoading = false;
    }
  };

  /**
   * Force stop all loading (useful for error recovery)
   */
  const forceStopLoading = () => {
    loadingState.value.activeRequests = 0;
    loadingState.value.isLoading = false;
  };

  return {
    isLoading: computed(() => loadingState.value.isLoading),
    activeRequests: computed(() => loadingState.value.activeRequests),
    startLoading,
    stopLoading,
    forceStopLoading,
  };
}
