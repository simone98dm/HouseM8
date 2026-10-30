import { describe, it, expect, vi } from 'vitest';
import { hitRateLimit } from '~~/server/utils/rate-limit-store';
import { executeQuery } from '~~/server/utils/postgres';

vi.mock('~~/server/utils/postgres', () => ({ executeQuery: vi.fn() }));

describe('hitRateLimit', () => {
  it('runs one atomic upsert and returns the new count', async () => {
    vi.mocked(executeQuery).mockResolvedValue({
      rows: [{ count: 3 }],
    } as never);
    await expect(hitRateLimit('ip:1.2.3.4', 60)).resolves.toBe(3);
    const [sql, params] = vi.mocked(executeQuery).mock.calls[0]!;
    expect(sql).toMatch(/ON CONFLICT \(key\) DO UPDATE/);
    expect(params).toEqual(['ip:1.2.3.4', 60]);
  });
});
