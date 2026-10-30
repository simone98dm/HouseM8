import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { useFeatureFlags } from '~/composables/useFeatureFlags';
import { useUserStore } from '~/stores/user';
import stripeMiddleware from '~/middleware/stripe';

vi.mock('~/composables/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
}));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const setAuthenticated = (isAuthenticated: boolean) =>
  vi
    .mocked(useUserStore)
    .mockReturnValue({ isAuthenticated } as ReturnType<typeof useUserStore>);

describe('middleware/stripe', () => {
  beforeEach(() => {
    navigateToMock.mockClear();
    setAuthenticated(true);
  });

  it('redirects an authenticated user to /dashboard when showStripe flag is off', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({
      isEnabled: vi.fn().mockReturnValue(false),
      getFlag: vi.fn(),
      flags: { value: {} } as any,
    });

    await (stripeMiddleware as (...args: unknown[]) => Promise<unknown>)(
      {} as any,
      {} as any,
    );

    expect(navigateToMock).toHaveBeenCalledWith('/dashboard');
  });

  it('sends an anonymous visitor to / rather than /dashboard, which would bounce them to login', async () => {
    setAuthenticated(false);
    vi.mocked(useFeatureFlags).mockReturnValue({
      isEnabled: vi.fn().mockReturnValue(false),
      getFlag: vi.fn(),
      flags: { value: {} } as any,
    });

    await (stripeMiddleware as (...args: unknown[]) => Promise<unknown>)(
      {} as any,
      {} as any,
    );

    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('does not redirect when showStripe flag is on', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({
      isEnabled: vi.fn().mockReturnValue(true),
      getFlag: vi.fn(),
      flags: { value: {} } as any,
    });

    const result = await (
      stripeMiddleware as (...args: unknown[]) => Promise<unknown>
    )({} as any, {} as any);

    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
