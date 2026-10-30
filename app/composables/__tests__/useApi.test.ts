import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useLoading } from '~/composables/useLoading';

vi.mock('~/composables/useLoading', () => ({
  useLoading: vi.fn(),
}));

describe('useApi', () => {
  let mockStartLoading: ReturnType<typeof vi.fn>;
  let mockStopLoading: ReturnType<typeof vi.fn>;
  let mockDollarFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockStartLoading = vi.fn();
    mockStopLoading = vi.fn();
    mockDollarFetch = vi.fn();
    vi.mocked(useLoading).mockReturnValue({
      startLoading: mockStartLoading,
      stopLoading: mockStopLoading,
    } as any);
    // Mock $fetch (global Nuxt auto-import)
    vi.stubGlobal('$fetch', mockDollarFetch);
  });

  describe('execute', () => {
    it('executes API call and returns result', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const mockData = { id: '1', name: 'Test' };
      const apiCall = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });

      const result = await api.execute(apiCall);

      expect(apiCall).toHaveBeenCalled();
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('starts and stops loading by default', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall = vi.fn().mockResolvedValue({ data: 'test', error: null });

      await api.execute(apiCall, true);

      expect(mockStartLoading).toHaveBeenCalled();
      expect(mockStopLoading).toHaveBeenCalled();
    });

    it('skips loader by default', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall = vi.fn().mockResolvedValue({ data: 'test', error: null });

      await api.execute(apiCall);

      expect(mockStartLoading).not.toHaveBeenCalled();
      expect(mockStopLoading).not.toHaveBeenCalled();
    });

    it('returns error response on thrown Error', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await api.execute(apiCall);

      expect(result).toEqual({ data: null, error: 'API Error' });
    });

    it('uses fallback message when error has no message', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall = vi.fn().mockRejectedValue({});

      const result = await api.execute(apiCall);

      expect(result).toEqual({
        data: null,
        error: 'An unexpected error occurred',
      });
    });

    it('stops loading even when error occurs', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall = vi.fn().mockRejectedValue(new Error('Test error'));

      await api.execute(apiCall, true);

      expect(mockStartLoading).toHaveBeenCalled();
      expect(mockStopLoading).toHaveBeenCalled();
    });
  });

  describe('fetch', () => {
    it('fetches data via $fetch and returns result', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const mockData = { id: '1' };
      mockDollarFetch.mockResolvedValue(mockData);

      const result = await api.fetch('/api/test');

      expect(mockDollarFetch).toHaveBeenCalledWith('/api/test', undefined);
      expect(result).toEqual(mockData);
    });

    it('passes options to $fetch', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const options = { method: 'POST', body: { x: 1 } };
      mockDollarFetch.mockResolvedValue({});

      await api.fetch('/api/test', options);

      expect(mockDollarFetch).toHaveBeenCalledWith('/api/test', options);
    });

    it('starts and stops loading by default', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      mockDollarFetch.mockResolvedValue({});

      await api.fetch('/api/test', {}, true);

      expect(mockStartLoading).toHaveBeenCalled();
      expect(mockStopLoading).toHaveBeenCalled();
    });

    it('skips loader by default', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      mockDollarFetch.mockResolvedValue({});

      await api.fetch('/api/test', {}, false);

      expect(mockStartLoading).not.toHaveBeenCalled();
      expect(mockStopLoading).not.toHaveBeenCalled();
    });

    it('propagates fetch errors', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      mockDollarFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.fetch('/api/test')).rejects.toThrow('Network error');
    });

    it('stops loading even when fetch fails', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      mockDollarFetch.mockRejectedValue(new Error('Network error'));

      try {
        await api.fetch('/api/test', {}, true);
      } catch {
        // expected
      }

      expect(mockStartLoading).toHaveBeenCalled();
      expect(mockStopLoading).toHaveBeenCalled();
    });
  });

  describe('executeAll', () => {
    it('executes multiple API calls and returns results', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall1 = vi.fn().mockResolvedValue({ data: 'a', error: null });
      const apiCall2 = vi.fn().mockResolvedValue({ data: 'b', error: null });

      const results = await api.executeAll([apiCall1, apiCall2]);

      expect(results).toEqual([
        { data: 'a', error: null },
        { data: 'b', error: null },
      ]);
    });

    it('starts and stops loading once for all calls', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall1 = vi.fn().mockResolvedValue({ data: '1', error: null });
      const apiCall2 = vi.fn().mockResolvedValue({ data: '2', error: null });

      await api.executeAll([apiCall1, apiCall2], true);

      expect(mockStartLoading).toHaveBeenCalledTimes(1);
      expect(mockStopLoading).toHaveBeenCalledTimes(1);
    });

    it('skips loader by default', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall = vi.fn().mockResolvedValue({ data: '1', error: null });

      await api.executeAll([apiCall], false);

      expect(mockStartLoading).not.toHaveBeenCalled();
      expect(mockStopLoading).not.toHaveBeenCalled();
    });

    it('returns error responses for all calls when one rejects', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();
      const apiCall1 = vi.fn().mockResolvedValue({ data: '1', error: null });
      const apiCall2 = vi.fn().mockRejectedValue(new Error('API Error'));

      const results = await api.executeAll([apiCall1, apiCall2]);

      expect(results).toEqual([
        { data: null, error: 'API Error' },
        { data: null, error: 'API Error' },
      ]);
    });

    it('handles empty array', async () => {
      const { useApi } = await import('~/composables/useApi');
      const api = useApi();

      const results = await api.executeAll([]);

      expect(results).toEqual([]);
    });
  });
});
