import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import { useNuxtApp } from 'nuxt/app';

import { useUserStore } from '~/stores/user';
import authMiddleware, {
  redirectLoggedOutOnServer,
} from '~/middleware/auth.global';

vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);
const cookies = vi.hoisted(() => ({ values: {} as Record<string, string> }));
mockNuxtImport('useCookie', () => (name: string) => ({
  value: cookies.values[name] ?? null,
}));

const makeRoute = (path: string, query: Record<string, string> = {}) => ({
  path,
  fullPath: path,
  query,
  params: {},
  hash: '',
});

describe('auth.global middleware', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    navigateToMock.mockClear();
    (useNuxtApp() as Record<string, unknown>)._sessionRestoreAttempted = false;
  });

  it('allows authenticated user on protected page', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: true,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    const result = await (
      authMiddleware as (...args: unknown[]) => Promise<unknown>
    )(makeRoute('/dashboard'));
    expect(navigateToMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: '/auth/login' }),
    );
    expect(result).toBeUndefined();
  });

  it('redirects authenticated user away from auth page to dashboard', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: true,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/auth/login'),
    );
    expect(navigateToMock).toHaveBeenCalledWith('/dashboard', {
      replace: true,
    });
  });

  it('allows unauthenticated user on public page', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    const result = await (
      authMiddleware as (...args: unknown[]) => Promise<unknown>
    )(makeRoute('/'));
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('redirects unauthenticated user from protected page to login', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/dashboard'),
    );
    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/auth/login',
      query: { redirect: '/dashboard' },
    });
  });

  it('allows unauthenticated user on auth page', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    const result = await (
      authMiddleware as (...args: unknown[]) => Promise<unknown>
    )(makeRoute('/auth/register'));
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('navigates to stored redirect after successful session restore', async () => {
    window.sessionStorage.setItem('auth_redirect', '/expenses');

    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: true,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/other-page'),
    );

    expect(navigateToMock).toHaveBeenCalledWith('/expenses', { replace: true });
    window.sessionStorage.removeItem('auth_redirect');
  });

  it('skips restore when _sessionRestoreAttempted is already true', async () => {
    (useNuxtApp() as Record<string, unknown>)._sessionRestoreAttempted = true;

    const fetchCurrentUser = vi.fn();
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser,
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/'),
    );

    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it('allows unauthenticated user on /privacy public page', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    const result = await (
      authMiddleware as (...args: unknown[]) => Promise<unknown>
    )(makeRoute('/privacy'));
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it.each(['/terms', '/cookies', '/accessibility'])(
    'allows unauthenticated user on the %s legal page',
    async (path) => {
      vi.mocked(useUserStore).mockReturnValue({
        isAuthenticated: false,
        fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useUserStore>);

      const result = await (
        authMiddleware as (...args: unknown[]) => Promise<unknown>
      )(makeRoute(path));
      expect(navigateToMock).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    },
  );

  it('allows unauthenticated user on /pricing public page', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    const result = await (
      authMiddleware as (...args: unknown[]) => Promise<unknown>
    )(makeRoute('/pricing'));
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('uses stored redirect for authenticated user on auth page', async () => {
    window.sessionStorage.setItem('auth_redirect', '/bills');
    (useNuxtApp() as Record<string, unknown>)._sessionRestoreAttempted = true;

    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: true,
      fetchCurrentUser: vi.fn(),
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/auth/login'),
    );
    expect(navigateToMock).toHaveBeenCalledWith('/bills', { replace: true });
    window.sessionStorage.removeItem('auth_redirect');
  });

  describe('pending deletion', () => {
    const run = (path: string, pending: boolean) => {
      vi.mocked(useUserStore).mockReturnValue({
        isAuthenticated: true,
        currentUser: { id: 'u1', pending_deletion: pending },
        fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useUserStore>);
      return (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
        makeRoute(path),
      );
    };

    it('redirects a pending user on a protected page', async () => {
      await run('/dashboard', true);
      expect(navigateToMock).toHaveBeenCalledWith(
        { path: '/account/pending-deletion', query: {} },
        { replace: true },
      );
    });

    it('forwards the email cancel_token to the pending page', async () => {
      vi.mocked(useUserStore).mockReturnValue({
        isAuthenticated: true,
        currentUser: { id: 'u1', pending_deletion: true },
        fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useUserStore>);
      await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
        makeRoute('/settings/privacy', { cancel_token: 'tok' }),
      );
      expect(navigateToMock).toHaveBeenCalledWith(
        { path: '/account/pending-deletion', query: { cancel_token: 'tok' } },
        { replace: true },
      );
    });

    it.each([
      '/account/pending-deletion',
      '/privacy',
      '/terms',
      '/cookies',
      '/accessibility',
      '/auth/login',
    ])('lets a pending user reach %s', async (path) => {
      await run(path, true);
      expect(navigateToMock).not.toHaveBeenCalled();
    });

    it('sends a non-pending user away from the pending page', async () => {
      await run('/account/pending-deletion', false);
      expect(navigateToMock).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('lets a logged-out visitor open an invite link', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    const result = await (
      authMiddleware as (...args: unknown[]) => Promise<unknown>
    )(makeRoute('/house/join/3f2b8c1e'));
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('keeps other /house routes protected', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/house/abc'),
    );
    expect(navigateToMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/auth/login' }),
    );
  });

  it('still bounces a pending-deletion user off the invite link', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: true,
      currentUser: { pending_deletion: true },
      fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useUserStore>);

    await (authMiddleware as (...args: unknown[]) => Promise<unknown>)(
      makeRoute('/house/join/3f2b8c1e'),
    );
    expect(navigateToMock).toHaveBeenCalledWith(
      { path: '/account/pending-deletion', query: {} },
      { replace: true },
    );
  });

  // import.meta.server is a compile-time constant, so the SSR branch is tested
  // through the helper the middleware delegates to.
  describe('server-side guard', () => {
    beforeEach(() => {
      cookies.values = {};
    });

    it('redirects a cookie-less visitor off a protected route with a 302', () => {
      redirectLoggedOutOnServer('/expenses', '/expenses?tab=2');
      expect(navigateToMock).toHaveBeenCalledWith(
        { path: '/auth/login', query: { redirect: '/expenses?tab=2' } },
        { redirectCode: 302 },
      );
    });

    it.each(['house_m8_access_token', 'house_m8_refresh_token'])(
      'does nothing when the %s cookie is present',
      (name) => {
        cookies.values = { [name]: 'x' };
        expect(
          redirectLoggedOutOnServer('/dashboard', '/dashboard'),
        ).toBeUndefined();
        expect(navigateToMock).not.toHaveBeenCalled();
      },
    );

    it.each([
      '/',
      '/pricing',
      '/privacy',
      '/terms',
      '/cookies',
      '/accessibility',
      '/auth/login',
      '/house/join/3f2b8c1e',
    ])('ignores %s', (path) => {
      redirectLoggedOutOnServer(path, path);
      expect(navigateToMock).not.toHaveBeenCalled();
    });

    it('drops an unsafe redirect target', () => {
      redirectLoggedOutOnServer('//evil.com', '//evil.com');
      expect(navigateToMock).toHaveBeenCalledWith(
        { path: '/auth/login', query: {} },
        { redirectCode: 302 },
      );
    });
  });
});
