import { describe, it, expect, vi } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { getUserPlan } from '~~/server/utils/plan-enforcement';

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));

const withStatus = (status: string | null) =>
  vi.mocked(getRepositories).mockReturnValue({
    subscriptions: {
      getByUserId: vi.fn().mockResolvedValue({
        data: status ? { plan: 'pro', status } : null,
      }),
    },
  } as never);

describe('getUserPlan', () => {
  it.each(['active', 'trialing'])('returns the paid plan for %s', async (s) => {
    withStatus(s);
    expect(await getUserPlan('u')).toBe('pro');
  });

  it.each([
    'past_due',
    'incomplete',
    'unpaid',
    'incomplete_expired',
    'paused',
    'canceled',
  ])('returns free for %s', async (s) => {
    withStatus(s);
    expect(await getUserPlan('u')).toBe('free');
  });

  it('returns free with no subscription', async () => {
    withStatus(null);
    expect(await getUserPlan('u')).toBe('free');
  });
});
