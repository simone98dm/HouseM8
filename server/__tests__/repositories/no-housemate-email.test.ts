import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresBulletinNoteRepository } from '../../repositories/postgres/PostgresBulletinNoteRepository';

const HOUSEMATE_FACING = ['Expense', 'Bill', 'BulletinNote', 'Report'];

describe('housemate-facing repositories', () => {
  it.each(HOUSEMATE_FACING)(
    'Postgres%sRepository never projects u.email',
    (name) => {
      const src = readFileSync(
        `server/repositories/postgres/Postgres${name}Repository.ts`,
        'utf8',
      );
      expect(src).not.toMatch(/'email',\s*u\.email/);
    },
  );

  it('PostgresBulletinNoteRepository.getByHouse SQL does not select u.email', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ total: '0' }] });
    const repo = new PostgresBulletinNoteRepository({
      query,
    } as unknown as Pool);

    await repo.getByHouse('h-1');

    expect(query).toHaveBeenCalled();
    for (const [sql] of query.mock.calls) {
      expect(String(sql)).not.toContain('u.email');
    }
  });
});
