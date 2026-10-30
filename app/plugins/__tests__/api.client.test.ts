import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

const navigateToMock = vi.hoisted(() => vi.fn());
const fetchCurrentUser = vi.hoisted(() => vi.fn());
const currentPath = vi.hoisted(() => ({ value: '/dashboard' }));

mockNuxtImport('navigateTo', () => navigateToMock);
mockNuxtImport('useUserStore', () => () => ({
  fetchCurrentUser,
  reset: vi.fn(),
}));
mockNuxtImport('useNotificationStore', () => () => ({
  addNotification: vi.fn(),
}));

const pendingError = () => ({
  response: { status: 403, statusText: 'Forbidden' },
  statusCode: 403,
  data: { statusCode: 403, data: { code: 'ACCOUNT_PENDING_DELETION' } },
});

describe('api.client plugin: pending deletion', () => {
  let baseFetch: ReturnType<typeof vi.fn>;
  let nuxtApp: {
    $router: { currentRoute: { value: { path: string } } };
    $fetch?: (url: string) => Promise<unknown>;
    provide: () => void;
  };

  beforeEach(async () => {
    navigateToMock.mockReset();
    fetchCurrentUser.mockReset().mockResolvedValue(undefined);
    currentPath.value = '/dashboard';
    baseFetch = vi.fn();
    vi.stubGlobal('$fetch', baseFetch);
    nuxtApp = {
      provide: vi.fn(),
      $router: {
        currentRoute: {
          get value() {
            return { path: currentPath.value };
          },
        },
      },
    };
    const plugin = (await import('~/plugins/api.client'))
      .default as unknown as (app: unknown) => void;
    plugin(nuxtApp);
  });

  it('refreshes the user then navigates once on ACCOUNT_PENDING_DELETION', async () => {
    baseFetch.mockRejectedValue(pendingError());
    await expect(nuxtApp.$fetch!('/api/houses')).rejects.toBeTruthy();
    expect(fetchCurrentUser).toHaveBeenCalledWith(true);
    expect(navigateToMock).toHaveBeenCalledTimes(1);
    expect(navigateToMock).toHaveBeenCalledWith('/account/pending-deletion', {
      replace: true,
    });
  });

  it('does not navigate again while already redirecting (concurrent 403s)', async () => {
    baseFetch.mockRejectedValue(pendingError());
    await Promise.allSettled([
      nuxtApp.$fetch!('/api/a'),
      nuxtApp.$fetch!('/api/b'),
      nuxtApp.$fetch!('/api/c'),
    ]);
    expect(navigateToMock).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when already on the pending-deletion page', async () => {
    currentPath.value = '/account/pending-deletion';
    baseFetch.mockRejectedValue(pendingError());
    await expect(nuxtApp.$fetch!('/api/houses')).rejects.toBeTruthy();
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it('ignores 403s with another code', async () => {
    baseFetch.mockRejectedValue({
      response: { status: 403, statusText: 'Forbidden' },
      statusCode: 403,
      data: { data: { code: 'OTHER' } },
    });
    await expect(nuxtApp.$fetch!('/api/houses')).rejects.toBeTruthy();
    expect(navigateToMock).not.toHaveBeenCalled();
  });
});
