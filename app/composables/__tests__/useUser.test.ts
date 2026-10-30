import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useUser', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  describe('getCurrentUser', () => {
    it('fetches current user successfully', async () => {
      const { useUser } = await import('~/composables/useUser');
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { getCurrentUser } = useUser();
      const result = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {}, false);
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('handles 503 status via response.status', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({ response: { status: 503 } });

      const { getCurrentUser } = useUser();
      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).toBe(
        'Authentication session not ready - please retry',
      );
    });

    it('handles 503 status via top-level status property', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({ status: 503 });

      const { getCurrentUser } = useUser();
      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).toBe(
        'Authentication session not ready - please retry',
      );
    });

    it('handles error with message in data', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({ data: { message: 'User not found' } });

      const { getCurrentUser } = useUser();
      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).toBe('User not found');
    });

    it('handles error with top-level message', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({ message: 'Network error' });

      const { getCurrentUser } = useUser();
      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
    });

    it('uses fallback message when error has no message', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({});

      const { getCurrentUser } = useUser();
      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch user');
    });
  });

  describe('updateProfile', () => {
    it('updates profile successfully', async () => {
      const { useUser } = await import('~/composables/useUser');
      const updates = { first_name: 'Jane', last_name: 'Smith' };
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        ...updates,
        created_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { updateProfile } = useUser();
      const result = await updateProfile(updates);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/me',
        { method: 'PUT', body: updates },
        true,
      );
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('handles update error', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue(new Error('Validation failed'));

      const { updateProfile } = useUser();
      const result = await updateProfile({ first_name: 'Jane' });

      expect(result.data).toBeNull();
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('getUserById', () => {
    it('fetches user by ID successfully', async () => {
      const { useUser } = await import('~/composables/useUser');
      const mockUser = {
        id: 'u-2',
        email: 'other@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        created_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { getUserById } = useUser();
      const result = await getUserById('u-2');

      expect(mockFetch).toHaveBeenCalledWith('/api/users/u-2', {}, false);
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('handles error when user not found', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue(new Error('User not found'));

      const { getUserById } = useUser();
      const result = await getUserById('invalid-id');

      expect(result.data).toBeNull();
      expect(result.error).toBe('User not found');
    });
  });

  describe('cancelDeletion', () => {
    it('posts to cancel-delete and unwraps data', async () => {
      const { useUser } = await import('~/composables/useUser');
      const data = { restored_house_ids: ['h1'], subscription_restored: null };
      mockFetch.mockResolvedValue({ data });
      const result = await useUser().cancelDeletion();
      expect(mockFetch).toHaveBeenCalledWith('/api/gdpr/cancel-delete', {
        method: 'POST',
        body: {},
      });
      expect(result).toEqual({ data, error: null });
    });

    it('returns the error on failure', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({ data: { message: 'nope' } });
      const result = await useUser().cancelDeletion();
      expect(result).toEqual({ data: null, error: 'nope' });
    });
  });

  describe('cancelDeletion 404', () => {
    it.each([{ statusCode: 404 }, { status: 404 }])(
      'maps %o to ALREADY_CANCELLED regardless of message',
      async (err) => {
        const { useUser } = await import('~/composables/useUser');
        mockFetch.mockRejectedValue({ ...err, message: 'whatever' });
        const result = await useUser().cancelDeletion();
        expect(result).toEqual({ data: null, error: 'ALREADY_CANCELLED' });
      },
    );
  });

  describe('getPendingSummary', () => {
    it('unwraps data', async () => {
      const { useUser } = await import('~/composables/useUser');
      const data = { houses: [] };
      mockFetch.mockResolvedValue({ data });
      const result = await useUser().getPendingSummary();
      expect(mockFetch).toHaveBeenCalledWith('/api/gdpr/pending-summary');
      expect(result).toEqual({ data, error: null });
    });

    it('returns the error on failure', async () => {
      const { useUser } = await import('~/composables/useUser');
      mockFetch.mockRejectedValue({ data: { message: 'bad' } });
      const result = await useUser().getPendingSummary();
      expect(result).toEqual({ data: null, error: 'bad' });
    });
  });

  describe('exportData', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reads the filename from Content-Disposition', async () => {
      const { useUser } = await import('~/composables/useUser');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('{}', {
            headers: {
              'content-disposition':
                'attachment; filename="house-m8-export-2026-10-26.json"',
            },
          }),
        ),
      );
      const result = await useUser().exportData();
      expect(result.data?.filename).toBe('house-m8-export-2026-10-26.json');
      expect(result.error).toBeNull();
    });

    it('falls back to a dated filename', async () => {
      const { useUser } = await import('~/composables/useUser');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
      const result = await useUser().exportData();
      expect(result.data?.filename).toMatch(
        /^house-m8-export-\d{4}-\d{2}-\d{2}\.json$/,
      );
    });

    it('returns an error when the response is not ok', async () => {
      const { useUser } = await import('~/composables/useUser');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('', { status: 500 })),
      );
      const result = await useUser().exportData();
      expect(result.data).toBeNull();
      expect(result.error).toContain('500');
    });
  });
});
