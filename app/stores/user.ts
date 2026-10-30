import { consola } from 'consola';
import { defineStore } from 'pinia';
import type { PendingSummary, User } from '~/types/domain/user';
import type {
  CancelDeletionResult,
  DataExportFile,
  RequestDeletionResult,
} from '~/composables/useUser';

interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

export const useUserStore = defineStore('user', () => {
  const { startLoading, stopLoading } = useLoading();
  const userService = useUser();
  const notificationStore = useNotificationStore();
  const auth = useAuth();

  const state = reactive<UserState>({
    currentUser: null,
    isLoading: false,
    error: null,
    lastFetch: null,
  });

  const isLoading = computed(() => state.isLoading);
  const hasError = computed(() => state.error !== null);
  const errorMessage = computed(() => state.error);
  const currentUser = computed(() => state.currentUser);
  const isAuthenticated = computed(() => !!state.currentUser);

  const isPendingDeletion = computed(
    () => state.currentUser?.pending_deletion === true,
  );

  const setLoading = (loading: boolean) => {
    state.isLoading = loading;
  };

  const setError = (error: string | null) => {
    state.error = error;
  };

  const clearError = () => {
    state.error = null;
  };

  const handleAsyncAction = async <T>(action: () => Promise<T>): Promise<T> => {
    clearError();
    setLoading(true);
    startLoading();
    try {
      const result = await action();
      state.lastFetch = new Date();
      return result;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'errors.anErrorOccurred';
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  // Check if data is fresh (less than 5 minutes old)
  const isDataFresh = (maxAgeMinutes: number = 5): boolean => {
    if (!state.lastFetch) return false;
    const now = new Date();
    const diffMinutes = (now.getTime() - state.lastFetch.getTime()) / 1000 / 60;
    return diffMinutes < maxAgeMinutes;
  };

  // Fetch current user profile
  const fetchCurrentUser = async (
    forceRefresh: boolean = false,
  ): Promise<void> => {
    // Return cached data if fresh and not forcing refresh
    if (!forceRefresh && state.currentUser && isDataFresh()) {
      return;
    }

    await handleAsyncAction(async () => {
      const response = await userService.getCurrentUser();

      if (response.error) {
        throw new Error(response.error);
      }

      state.currentUser = response.data;
    });
  };

  // Update user profile
  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!state.currentUser) throw new Error('errors.userNotAuthenticated');

    await handleAsyncAction(async () => {
      const response = await userService.updateProfile(updates);

      if (response.error) {
        // Log the real error (e.g. raw zod validation array) for debugging,
        // but show the user a generic, translated message — EXCEPT when the
        // composable already resolved it to an actionable i18n key (a taken
        // email address), which the user can fix and retry.
        consola.error('Failed to update profile:', response.error);
        const isActionable = response.error.startsWith('profile.');
        notificationStore.error(
          'errors.failedToUpdateProfile',
          isActionable ? response.error : 'errors.anErrorOccurred',
          { i18n: true },
        );
        throw new Error(response.error);
      }

      state.currentUser = response.data;

      // Show success notification
      notificationStore.success(
        'success.profileUpdated',
        'profile.notifications.profileUpdatedDesc',
        { i18n: true },
      );
    });
  };

  // Cancel a scheduled deletion, then refresh the user so route guards see it
  const cancelDeletion = async (): Promise<{
    result: CancelDeletionResult | null;
    error: string | null;
  }> => {
    const response = await userService.cancelDeletion();
    if (response.error || !response.data) {
      consola.error('Failed to cancel deletion:', response.error);
      return { result: null, error: response.error };
    }
    await fetchCurrentUser(true);
    return { result: response.data, error: null };
  };

  // Per-house balances left behind while deletion is pending
  const pendingSummary = ref<PendingSummary | null>(null);
  const isPendingSummaryLoading = ref(false);
  const pendingSummaryError = ref<string | null>(null);

  const loadPendingSummary = async (): Promise<void> => {
    isPendingSummaryLoading.value = true;
    pendingSummaryError.value = null;
    try {
      const response = await userService.getPendingSummary();
      if (response.error || !response.data) {
        consola.error('Failed to load pending summary:', response.error);
        pendingSummary.value = null;
        pendingSummaryError.value = response.error ?? 'errors.anErrorOccurred';
        return;
      }
      pendingSummary.value = response.data;
    } finally {
      isPendingSummaryLoading.value = false;
    }
  };

  // Schedule account deletion; failures come back as a typed code
  const requestDeletion = (): Promise<RequestDeletionResult> =>
    userService.requestDeletion();

  // GDPR export file; `error` is a message (EXPORT_RATE_LIMITED on 429)
  const exportData = async (): Promise<{
    data: DataExportFile | null;
    error: string | null;
  }> => {
    const response = await userService.exportData();
    return { data: response.data, error: response.error };
  };

  // Initialize store
  const initialize = async (): Promise<void> => {
    // Try to fetch current user from API
    // If successful, user is authenticated
    try {
      await fetchCurrentUser();
    } catch {
      // User is not authenticated or session expired
      state.currentUser = null;
    }
  };

  // Reset store
  const reset = () => {
    state.currentUser = null;
    state.isLoading = false;
    state.error = null;
    state.lastFetch = null;
  };

  // Register new user (email + consent only — name/password set in wizard)
  const register = async (
    email: string,
  ): Promise<{ success: boolean; message?: string }> => {
    clearError();
    setLoading(true);
    startLoading();

    try {
      const response = await auth.register(email);

      // Failures come back as i18n keys; the page shows them inline, so no
      // toast repeats the same message.
      if (response.error) {
        setError(response.error);
        return { success: false, message: response.error };
      }

      if (response.data?.success) {
        // The page swaps to its own "check your email" state: no toast.
        return {
          success: true,
          message: response.data.message,
        };
      }

      const errorMsg = 'auth.errors.tryAgainLater';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } catch {
      const errorMsg = 'auth.errors.tryAgainLater';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  // Mail a fresh sign-up link (unconfirmed accounts only; same answer for all)
  const resendConfirmation = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const response = await auth.resendConfirmation(email);
    return response.error
      ? { success: false, error: response.error }
      : { success: true };
  };

  // Login user
  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<{ success: boolean; error?: string }> => {
    clearError();
    setLoading(true);
    startLoading();

    try {
      const response = await auth.signInWithPassword(
        email,
        password,
        rememberMe,
      );

      // Failures come back as i18n keys; the page shows them inline.
      if (response.error) {
        setError(response.error);
        return { success: false, error: response.error };
      }

      // After successful login, fetch full user profile
      if (response.data?.user) {
        // Fetch the complete user profile
        await fetchCurrentUser(true);

        notificationStore.success(
          'auth.login.success',
          'auth.login.welcomeBack',
          { i18n: true },
        );

        return { success: true };
      }

      const errorMsg = 'auth.errors.tryAgainLater';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch {
      const errorMsg = 'auth.errors.tryAgainLater';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  return {
    isLoading,
    hasError,
    errorMessage,
    currentUser,
    isAuthenticated,
    isPendingDeletion,

    fetchCurrentUser,
    cancelDeletion,
    pendingSummary,
    isPendingSummaryLoading,
    pendingSummaryError,
    loadPendingSummary,
    requestDeletion,
    exportData,
    updateProfile,
    initialize,
    reset,
    clearError,
    register,
    resendConfirmation,
    login,
  };
});
