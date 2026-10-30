import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresSubscriptionRepository } from '../../repositories/postgres/PostgresSubscriptionRepository';

describe('PostgresSubscriptionRepository.upsert trial_used_at', () => {
  const run = async (trialUsedAt?: string | null) => {
    const query = vi.fn().mockResolvedValue({ rows: [{}] });
    const repo = new PostgresSubscriptionRepository({
      query,
    } as unknown as Pool);
    await repo.upsert('u-1', {
      plan: 'free',
      status: 'canceled',
      trial_used_at: trialUsedAt,
    });
    return query.mock.calls[0] as [string, unknown[]];
  };

  it('never overwrites an existing trial_used_at', async () => {
    const [sql] = await run();
    expect(sql).toMatch(
      /trial_used_at = COALESCE\(subscriptions\.trial_used_at, EXCLUDED\.trial_used_at\)/,
    );
  });

  it('passes null when omitted and the value when given', async () => {
    expect((await run())[1][8]).toBeNull();
    expect((await run('2026-01-01T00:00:00Z'))[1][8]).toBe(
      '2026-01-01T00:00:00Z',
    );
  });
});
