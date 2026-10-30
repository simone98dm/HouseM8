import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

const navigateToMock = vi.hoisted(() => vi.fn());
const fetchCurrentUser = vi.hoisted(() => vi.fn());
const reset = vi.hoisted(() => vi.fn());
const addNotification = vi.hoisted(() => vi.fn());

mockNuxtImport('navigateTo', () => navigateToMock);
mockNuxtImport('useUserStore', () => () => ({ fetchCurrentUser, reset }));
mockNuxtImport('useNotificationStore', () => () => ({ addNotification }));

type Fetch = (req: unknown, opts?: Record<string, unknown>) => Promise<unknown>;
const httpError = (status: number, extra: object = {}) => ({
  response: { status, statusText: 'x', ...extra },
  statusCode: status,
});

describe('api.client plugin: error handling', () => {
  let baseFetch: ReturnType<typeof vi.fn>;
  let nuxtApp: { $router: unknown; $fetch?: Fetch; provide: () => void };
  const realFetch = globalThis.$fetch;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchCurrentUser.mockResolvedValue(undefined);
    navigateToMock.mockResolvedValue(undefined);
    baseFetch = vi.fn();
    vi.stubGlobal('$fetch', baseFetch);
    nuxtApp = {
      provide: vi.fn(),
      $router: { currentRoute: { value: { path: '/dashboard' } } },
    };
    const plugin = (await import('~/plugins/api.client'))
      .default as unknown as (app: unknown) => void;
    plugin(nuxtApp);
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.$fetch = realFetch;
  });

  it('returns the response on success and accepts URL and Request inputs', async () => {
    baseFetch.mockResolvedValue({ ok: 1 });
    await expect(nuxtApp.$fetch!('/api/a')).resolves.toEqual({ ok: 1 });
    await nuxtApp.$fetch!(new URL('http://x.test/api/b'));
    await nuxtApp.$fetch!(new Request('http://x.test/api/c'));
    expect(baseFetch.mock.calls.map((c) => c[0])).toEqual([
      '/api/a',
      'http://x.test/api/b',
      'http://x.test/api/c',
    ]);
  });

  it('provides the config to the app', () => {
    expect(nuxtApp.provide).toHaveBeenCalledWith(
      'apiConfig',
      expect.any(Object),
    );
  });

  it('detects the pending-deletion code in response._data too', async () => {
    baseFetch.mockRejectedValue({
      response: {
        status: 403,
        statusText: 'x',
        _data: { code: 'ACCOUNT_PENDING_DELETION' },
      },
    });
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toBeTruthy();
    expect(navigateToMock).toHaveBeenCalledWith('/account/pending-deletion', {
      replace: true,
    });
  });

  it('swallows a failing redirect, still rethrows the API error and allows a later redirect', async () => {
    const err = {
      ...httpError(403),
      data: { data: { code: 'ACCOUNT_PENDING_DELETION' } },
    };
    baseFetch.mockRejectedValue(err);
    fetchCurrentUser.mockRejectedValueOnce(new Error('boom'));
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toBe(err);
    expect(navigateToMock).not.toHaveBeenCalled();
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toBe(err);
    expect(navigateToMock).toHaveBeenCalledTimes(1);
  });

  it('shows an access-denied notification on a plain 403', async () => {
    baseFetch.mockRejectedValue(httpError(403));
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toBeTruthy();
    expect(addNotification).toHaveBeenCalledWith(
      'error',
      'errors.accessDenied',
      'errors.accessDeniedMessage',
      expect.objectContaining({ i18n: true }),
    );
  });

  it('does not notify on a 404', async () => {
    baseFetch.mockRejectedValue(httpError(404));
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toBeTruthy();
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('refreshes the token on 401 and retries the original request', async () => {
    baseFetch
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({}) // refresh
      .mockResolvedValueOnce({ data: 'again' });
    await expect(nuxtApp.$fetch!('/api/a')).resolves.toEqual({
      data: 'again',
    });
    expect(baseFetch.mock.calls[1]![0]).toBe('/api/auth/refresh');
  });

  it('signs the user out when the refresh fails', async () => {
    baseFetch
      .mockRejectedValueOnce(httpError(401))
      .mockRejectedValueOnce(httpError(401));
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toThrow('Session expired');
    expect(reset).toHaveBeenCalled();
    expect(navigateToMock).toHaveBeenCalledWith('/auth/login', {
      replace: true,
    });
    expect(addNotification).toHaveBeenCalledWith(
      'error',
      'errors.sessionExpired',
      'errors.sessionExpiredMessage',
      expect.anything(),
    );
  });

  it('survives a failing logout navigation', async () => {
    baseFetch.mockRejectedValue(httpError(401));
    navigateToMock.mockRejectedValue(new Error('nav'));
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toThrow('Session expired');
  });

  it('does not try to refresh for auth routes', async () => {
    const err = httpError(401);
    baseFetch.mockRejectedValue(err);
    await expect(nuxtApp.$fetch!('/api/auth/signin')).rejects.toBe(err);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it('retries 5xx with backoff then notifies a server error', async () => {
    vi.useFakeTimers();
    baseFetch.mockRejectedValue(httpError(500));
    const p = nuxtApp.$fetch!('/api/a').catch((e) => e);
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    expect(baseFetch).toHaveBeenCalledTimes(3);
    expect(addNotification).toHaveBeenCalledWith(
      'error',
      'errors.serverError',
      'errors.serverErrorMessage',
      expect.anything(),
    );
  });

  it('does not retry a 429 and shows the too-many-requests toast', async () => {
    baseFetch.mockRejectedValue(httpError(429));
    await expect(nuxtApp.$fetch!('/api/a')).rejects.toBeTruthy();
    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith(
      'error',
      'errors.tooManyRequests',
      'errors.tooManyRequestsMessage',
      expect.objectContaining({ i18n: true }),
    );
  });

  it('recovers when a retry succeeds', async () => {
    vi.useFakeTimers();
    baseFetch
      .mockRejectedValueOnce({ message: 'offline' })
      .mockResolvedValueOnce('ok');
    const p = nuxtApp.$fetch!('/api/a');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('ok');
  });
});
