import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as configcat from '@configcat/sdk/node';

import {
  isFeatureEnabled,
  getAllFeatureFlags,
} from '~~/server/utils/feature-flags';

const getValueAsync = vi.hoisted(() => vi.fn());

// Mutate the real Nuxt runtime config object (what the code under test reads).
let runtime: Record<string, string>;

vi.mock('@configcat/sdk/node', () => ({
  PollingMode: { LazyLoad: 2 },
  getClient: vi.fn(() => ({ getValueAsync })),
}));

describe('feature-flags (ConfigCat)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime = useRuntimeConfig() as unknown as Record<string, string>;
    runtime.configcatSdkKey = 'configcat-sdk-test';
  });

  it('returns the ConfigCat value with false as default', async () => {
    getValueAsync.mockResolvedValue(true);

    expect(await isFeatureEnabled('showStripe')).toBe(true);
    expect(getValueAsync).toHaveBeenCalledWith('showStripe', false);
    expect(configcat.getClient).toHaveBeenCalledWith(
      'configcat-sdk-test',
      configcat.PollingMode.LazyLoad,
      { cacheTimeToLiveSeconds: 60 },
    );
  });

  it('is off without calling ConfigCat when the SDK key is missing', async () => {
    runtime.configcatSdkKey = '';

    expect(await isFeatureEnabled('showSignup')).toBe(false);
    expect(configcat.getClient).not.toHaveBeenCalled();
  });

  it('is off when ConfigCat throws', async () => {
    getValueAsync.mockRejectedValue(new Error('network'));

    expect(await isFeatureEnabled('showSignup')).toBe(false);
  });

  it('resolves every known flag', async () => {
    getValueAsync.mockImplementation(
      async (key: string) => key === 'showSignup',
    );

    expect(await getAllFeatureFlags()).toEqual({
      showStripe: false,
      showSignup: true,
      showProfilePicture: false,
    });
  });
});
