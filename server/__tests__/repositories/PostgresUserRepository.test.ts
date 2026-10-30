import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresUserRepository } from '../../repositories/postgres/PostgresUserRepository';

const makeRepo = () => {
  const query = vi.fn().mockResolvedValue({ rows: [{ id: 'u-1' }] });
  const repo = new PostgresUserRepository({ query } as unknown as Pool);
  return { repo, query };
};

describe('PostgresUserRepository — no secret columns returned', () => {
  it('create does not RETURNING *', async () => {
    const { repo, query } = makeRepo();
    await repo.create('u-1', { email: 'a@b.com' });

    const sql = query.mock.calls[0]![0] as string;
    expect(sql).not.toContain('RETURNING *');
    expect(sql).not.toContain('password_hash');
    expect(sql).toMatch(/RETURNING\s+id, email/);
  });

  it('update does not RETURNING *', async () => {
    const { repo, query } = makeRepo();
    await repo.update('u-1', { first_name: 'Ann' });

    const sql = query.mock.calls[0]![0] as string;
    expect(sql).not.toContain('RETURNING *');
    expect(sql).not.toContain('password_hash');
    expect(sql).toMatch(/RETURNING\s+id, email/);
  });
});
