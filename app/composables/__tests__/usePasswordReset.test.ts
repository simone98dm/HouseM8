import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('usePasswordReset', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({
      fetch: mockFetch,
    } as unknown as ReturnType<typeof useApi>);
  });

  describe('requestReset', () => {
    it('posts the email and returns the response on success', async () => {
      const { usePasswordReset } =
        await import('~/composables/usePasswordReset');
      const mockResponse = { success: true, message: 'sent' };
      mockFetch.mockResolvedValue(mockResponse);

      const { requestReset } = usePasswordReset();
      const result = await requestReset('user@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/password-reset/request',
        { method: 'POST', body: { email: 'user@example.com' } },
      );
      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeNull();
    });

    it('returns an error when the request itself fails (network failure)', async () => {
      const { usePasswordReset } =
        await import('~/composables/usePasswordReset');
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const { requestReset } = usePasswordReset();
      const result = await requestReset('user@example.com');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('confirmReset', () => {
    it('posts the token and password and reports success', async () => {
      const { usePasswordReset } =
        await import('~/composables/usePasswordReset');
      mockFetch.mockResolvedValue({ success: true, message: 'done' });

      const { confirmReset } = usePasswordReset();
      const result = await confirmReset('valid-token', 'newpassword123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/password-reset/confirm',
        {
          method: 'POST',
          body: { token: 'valid-token', newPassword: 'newpassword123' },
        },
      );
      expect(result).toEqual({ success: true, error: null, errorType: null });
    });

    it('classifies a 400 response as an invalid-token error', async () => {
      const { usePasswordReset } =
        await import('~/composables/usePasswordReset');
      mockFetch.mockRejectedValue({
        status: 400,
        data: { statusMessage: 'Invalid or expired reset token' },
      });

      const { confirmReset } = usePasswordReset();
      const result = await confirmReset('bad-token', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('invalid-token');
      expect(result.error).toBe('Invalid or expired reset token');
    });

    it('classifies a thrown error with no status as a network error', async () => {
      const { usePasswordReset } =
        await import('~/composables/usePasswordReset');
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const { confirmReset } = usePasswordReset();
      const result = await confirmReset('any-token', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toBe('Failed to fetch');
    });

    it('classifies a 500 response as a network error, not an invalid token', async () => {
      const { usePasswordReset } =
        await import('~/composables/usePasswordReset');
      mockFetch.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal Server Error',
      });

      const { confirmReset } = usePasswordReset();
      const result = await confirmReset('any-token', 'newpassword123');

      expect(result.errorType).toBe('network');
    });
  });
});
