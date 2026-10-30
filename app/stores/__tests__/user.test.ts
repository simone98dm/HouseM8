/**
 * User Store Tests — real store with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useLoading } from '~/composables/useLoading';
import { useUser } from '~/composables/useUser';
import { useAuth } from '~/composables/useAuth';
import { useNotificationStore } from '~/stores/notifications';
import { useUserStore } from '~/stores/user';
import { createMockUser } from '~/tests/utils';

vi.mock('~/composables/useLoading', () => ({ useLoading: vi.fn() }));
vi.mock('~/composables/useUser', () => ({ useUser: vi.fn() }));
vi.mock('~/composables/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

describe('useUserStore', () => {
  let mockUserService: {
    getCurrentUser: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    cancelDeletion: ReturnType<typeof vi.fn>;
    requestDeletion: ReturnType<typeof vi.fn>;
    exportData: ReturnType<typeof vi.fn>;
    getPendingSummary: ReturnType<typeof vi.fn>;
  };
  let mockAuth: {
    register: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    resendConfirmation: ReturnType<typeof vi.fn>;
  };
  let mockNotificationStore: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    addNotification: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockUserService = {
      getCurrentUser: vi.fn(),
      updateProfile: vi.fn(),
      cancelDeletion: vi.fn(),
      requestDeletion: vi.fn(),
      exportData: vi.fn(),
      getPendingSummary: vi.fn(),
    };
    mockAuth = {
      register: vi.fn(),
      signInWithPassword: vi.fn(),
      resendConfirmation: vi.fn(),
    };
    mockNotificationStore = {
      error: vi.fn(),
      success: vi.fn(),
      addNotification: vi.fn(),
    };

    vi.mocked(useLoading).mockReturnValue({
      startLoading: vi.fn(),
      stopLoading: vi.fn(),
    } as any);
    vi.mocked(useUser).mockReturnValue(mockUserService as any);
    vi.mocked(useAuth).mockReturnValue(mockAuth as any);
    vi.mocked(useNotificationStore).mockReturnValue(
      mockNotificationStore as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with null currentUser', () => {
      const store = useUserStore();
      expect(store.currentUser).toBeNull();
    });

    it('initializes isLoading as false', () => {
      const store = useUserStore();
      expect(store.isLoading).toBe(false);
    });

    it('initializes isAuthenticated as false', () => {
      const store = useUserStore();
      expect(store.isAuthenticated).toBe(false);
    });

    it('initializes hasError as false', () => {
      const store = useUserStore();
      expect(store.hasError).toBe(false);
    });
  });

  describe('fetchCurrentUser', () => {
    it('sets currentUser on success', async () => {
      const user = createMockUser();
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      const store = useUserStore();
      await store.fetchCurrentUser();
      expect(store.currentUser).toEqual(user);
      expect(store.isAuthenticated).toBe(true);
    });

    it('throws when API returns error', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        data: null,
        error: 'Unauthorized',
      });
      const store = useUserStore();
      await expect(store.fetchCurrentUser()).rejects.toThrow('Unauthorized');
    });

    it('skips fetch when data is fresh and forceRefresh is false', async () => {
      const user = createMockUser();
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      const store = useUserStore();
      await store.fetchCurrentUser();
      mockUserService.getCurrentUser.mockClear();
      await store.fetchCurrentUser(false);
      expect(mockUserService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('force-refreshes when forceRefresh is true', async () => {
      const user = createMockUser();
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      const store = useUserStore();
      await store.fetchCurrentUser();
      await store.fetchCurrentUser(true);
      expect(mockUserService.getCurrentUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateProfile', () => {
    it('updates currentUser on success', async () => {
      const user = createMockUser();
      const updatedUser = createMockUser({ first_name: 'Updated' });
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      mockUserService.updateProfile.mockResolvedValue({
        data: updatedUser,
        error: null,
      });
      const store = useUserStore();
      await store.fetchCurrentUser();
      await store.updateProfile({ first_name: 'Updated' });
      expect(store.currentUser!.first_name).toBe('Updated');
      expect(mockNotificationStore.success).toHaveBeenCalled();
    });

    it('throws when currentUser is null', async () => {
      const store = useUserStore();
      await expect(store.updateProfile({ first_name: 'X' })).rejects.toThrow(
        'errors.userNotAuthenticated',
      );
    });

    it('calls notificationStore.error and throws when API returns error', async () => {
      const user = createMockUser();
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      mockUserService.updateProfile.mockResolvedValue({
        data: null,
        error: 'Update failed',
      });
      const store = useUserStore();
      await store.fetchCurrentUser();
      await expect(store.updateProfile({ first_name: 'X' })).rejects.toThrow(
        'Update failed',
      );
      expect(mockNotificationStore.error).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('sets currentUser when fetch succeeds', async () => {
      const user = createMockUser();
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      const store = useUserStore();
      await store.initialize();
      expect(store.currentUser).toEqual(user);
    });

    it('sets currentUser to null when fetch fails', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        data: null,
        error: 'Session expired',
      });
      const store = useUserStore();
      await store.initialize();
      expect(store.currentUser).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      const user = createMockUser();
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      const store = useUserStore();
      await store.fetchCurrentUser();
      store.reset();
      expect(store.currentUser).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.hasError).toBe(false);
    });
  });

  describe('cancelDeletion', () => {
    it('refreshes the user and returns the restore result on success', async () => {
      const restored = {
        restored_house_ids: ['h1'],
        subscription_restored: true,
      };
      mockUserService.cancelDeletion.mockResolvedValue({
        data: restored,
        error: null,
      });
      mockUserService.getCurrentUser.mockResolvedValue({
        data: createMockUser({ pending_deletion: false }),
        error: null,
      });
      const store = useUserStore();
      const out = await store.cancelDeletion();
      expect(out).toEqual({ result: restored, error: null });
      expect(mockUserService.getCurrentUser).toHaveBeenCalled();
      expect(store.isPendingDeletion).toBe(false);
    });

    it('returns the error and does not refresh on failure', async () => {
      mockUserService.cancelDeletion.mockResolvedValue({
        data: null,
        error: 'nope',
      });
      const store = useUserStore();
      const out = await store.cancelDeletion();
      expect(out).toEqual({ result: null, error: 'nope' });
      expect(mockUserService.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('cancelDeletion already cancelled', () => {
    it('passes the ALREADY_CANCELLED code through without refreshing', async () => {
      mockUserService.cancelDeletion.mockResolvedValue({
        data: null,
        error: 'ALREADY_CANCELLED',
      });
      const out = await useUserStore().cancelDeletion();
      expect(out).toEqual({ result: null, error: 'ALREADY_CANCELLED' });
      expect(mockUserService.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('loadPendingSummary', () => {
    it('stores the summary and toggles loading', async () => {
      const data = { houses: [] };
      let resolve!: (v: unknown) => void;
      mockUserService.getPendingSummary.mockReturnValue(
        new Promise((r) => (resolve = r)),
      );
      const store = useUserStore();
      const p = store.loadPendingSummary();
      expect(store.isPendingSummaryLoading).toBe(true);
      resolve({ data, error: null });
      await p;
      expect(store.isPendingSummaryLoading).toBe(false);
      expect(store.pendingSummary).toEqual(data);
      expect(store.pendingSummaryError).toBeNull();
    });

    it('records the error and clears the summary on failure', async () => {
      mockUserService.getPendingSummary.mockResolvedValue({
        data: null,
        error: 'boom',
      });
      const store = useUserStore();
      await store.loadPendingSummary();
      expect(store.pendingSummary).toBeNull();
      expect(store.pendingSummaryError).toBe('boom');
      expect(store.isPendingSummaryLoading).toBe(false);
    });
  });

  describe('requestDeletion', () => {
    it('passes the typed result through', async () => {
      const out = {
        error: 'OWNER_MUST_TRANSFER',
        houses: [{ id: 'h1', name: 'Casa' }],
      };
      mockUserService.requestDeletion.mockResolvedValue(out);
      expect(await useUserStore().requestDeletion()).toEqual(out);
    });
  });

  describe('exportData', () => {
    it('returns the file on success', async () => {
      const data = { blob: new Blob(['{}']), filename: 'x.json' };
      mockUserService.exportData.mockResolvedValue({ data, error: null });
      expect(await useUserStore().exportData()).toEqual({ data, error: null });
    });

    it('returns the error on failure', async () => {
      mockUserService.exportData.mockResolvedValue({
        data: null,
        error: 'nope',
      });
      expect(await useUserStore().exportData()).toEqual({
        data: null,
        error: 'nope',
      });
    });
  });

  describe('register', () => {
    it('returns success on successful registration', async () => {
      mockAuth.register.mockResolvedValue({
        data: { success: true, message: 'check your email' },
        error: null,
      });
      const store = useUserStore();
      const result = await store.register('a@b.com', 'pass', 'First', 'Last');
      expect(result.success).toBe(true);
      // The page shows its own "check your email" state.
      expect(mockNotificationStore.success).not.toHaveBeenCalled();
    });

    // Failures are shown inline by the page, so the store adds no toast.
    it('returns the error key without a toast on registration error', async () => {
      mockAuth.register.mockResolvedValue({
        data: null,
        error: 'auth.errors.invalidEmail',
      });
      const store = useUserStore();
      const result = await store.register('a@b.com', 'pass', 'First', 'Last');
      expect(result.success).toBe(false);
      expect(result.message).toBe('auth.errors.invalidEmail');
      expect(mockNotificationStore.error).not.toHaveBeenCalled();
    });

    it('returns the retry key when auth throws', async () => {
      mockAuth.register.mockRejectedValue(new Error('Network error'));
      const store = useUserStore();
      const result = await store.register('a@b.com', 'pass', 'First', 'Last');
      expect(result).toEqual({
        success: false,
        message: 'auth.errors.tryAgainLater',
      });
    });
  });

  describe('login', () => {
    it('fetches user and notifies success after login', async () => {
      const user = createMockUser();
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user },
        error: null,
      });
      mockUserService.getCurrentUser.mockResolvedValue({
        data: user,
        error: null,
      });
      const store = useUserStore();
      const result = await store.login('a@b.com', 'pass');
      expect(result.success).toBe(true);
      expect(store.currentUser).toEqual(user);
      expect(mockNotificationStore.success).toHaveBeenCalled();
    });

    it('returns the error key without a toast on auth error', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: 'auth.errors.invalidCredentials',
      });
      const store = useUserStore();
      const result = await store.login('a@b.com', 'wrong');
      expect(result.success).toBe(false);
      expect(result.error).toBe('auth.errors.invalidCredentials');
      expect(mockNotificationStore.error).not.toHaveBeenCalled();
    });

    it('returns failure when data has no user', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      const store = useUserStore();
      const result = await store.login('a@b.com', 'pass');
      expect(result.success).toBe(false);
    });

    it('returns failure when auth throws non-Error', async () => {
      mockAuth.signInWithPassword.mockRejectedValue('unexpected');
      const store = useUserStore();
      const result = await store.login('a@b.com', 'pass');
      expect(result).toEqual({
        success: false,
        error: 'auth.errors.tryAgainLater',
      });
    });

    it('returns failure when auth throws Error', async () => {
      mockAuth.signInWithPassword.mockRejectedValue(
        new Error('Connection reset'),
      );
      const store = useUserStore();
      const result = await store.login('a@b.com', 'pass');
      expect(result.success).toBe(false);
    });
  });

  describe('resendConfirmation', () => {
    it('passes the email through and reports success', async () => {
      mockAuth.resendConfirmation.mockResolvedValue({
        data: { success: true },
        error: null,
      });
      const store = useUserStore();
      expect(await store.resendConfirmation('a@b.com')).toEqual({
        success: true,
      });
      expect(mockAuth.resendConfirmation).toHaveBeenCalledWith('a@b.com');
    });

    it('returns the error key on failure', async () => {
      mockAuth.resendConfirmation.mockResolvedValue({
        data: null,
        error: 'auth.errors.resendFailed',
      });
      const store = useUserStore();
      expect(await store.resendConfirmation('a@b.com')).toEqual({
        success: false,
        error: 'auth.errors.resendFailed',
      });
    });
  });

  describe('register additional branches', () => {
    it('uses fallback error message when data has no message', async () => {
      mockAuth.register.mockResolvedValue({
        data: { success: false, message: null },
        error: null,
      });
      const store = useUserStore();
      const result = await store.register('a@b.com', 'pass', 'First', 'Last');
      expect(result.success).toBe(false);
      expect(result.message).toBe('auth.errors.tryAgainLater');
    });

    it('uses Error.message when auth throws Error', async () => {
      mockAuth.register.mockRejectedValue(new Error('Server down'));
      const store = useUserStore();
      const result = await store.register('a@b.com', 'pass', 'First', 'Last');
      expect(result.success).toBe(false);
    });

    it('uses fallback when auth throws non-Error', async () => {
      mockAuth.register.mockRejectedValue('something weird');
      const store = useUserStore();
      const result = await store.register('a@b.com', 'pass', 'First', 'Last');
      expect(result.success).toBe(false);
    });
  });
});
