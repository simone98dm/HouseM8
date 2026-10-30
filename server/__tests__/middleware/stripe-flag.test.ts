/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFeatureEnabled } from '~~/server/utils/feature-flags';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));

vi.mock('~~/server/utils/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));

function mockFlag(value: boolean) {
  vi.mocked(isFeatureEnabled).mockResolvedValue(value);
}

describe('stripe-flag middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects /api/stripe/* with 404 when flag is off', async () => {
    mockFlag(false);
    const { default: handler } = await import('../../middleware/stripe-flag');
    await expect(
      (handler as Function)({ path: '/api/stripe/checkout' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('passes /api/stripe/* through when flag is on', async () => {
    mockFlag(true);
    const { default: handler } = await import('../../middleware/stripe-flag');
    await expect(
      (handler as Function)({ path: '/api/stripe/checkout' }),
    ).resolves.toBeUndefined();
  });

  it('ignores other paths without reading the flag', async () => {
    const { default: handler } = await import('../../middleware/stripe-flag');
    await (handler as Function)({ path: '/api/auth/signin' });
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });
});
