/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAllFeatureFlags } from '~~/server/utils/feature-flags';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);

vi.mock('~~/server/utils/feature-flags', () => ({
  getAllFeatureFlags: vi.fn(),
}));

describe('GET /api/feature-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the resolved ConfigCat flags', async () => {
    const flags = {
      showStripe: true,
      showSignup: false,
      showProfilePicture: false,
    };
    vi.mocked(getAllFeatureFlags).mockResolvedValue(flags);

    const { default: handler } = await import('../../api/feature-flags.get');
    const result = await (handler as Function)({});

    expect(result).toEqual(flags);
  });
});
