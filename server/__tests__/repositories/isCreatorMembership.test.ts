import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresExpenseRepository } from '../../repositories/postgres/PostgresExpenseRepository';
import { PostgresBillRepository } from '../../repositories/postgres/PostgresBillRepository';
import { PostgresBulletinNoteRepository } from '../../repositories/postgres/PostgresBulletinNoteRepository';
import { PostgresReportRepository } from '../../repositories/postgres/PostgresReportRepository';

const cases = [
  ['expenses', PostgresExpenseRepository],
  ['bills', PostgresBillRepository],
  ['bulletin_notes', PostgresBulletinNoteRepository],
  ['reports', PostgresReportRepository],
] as const;

describe.each(cases)('%s isCreator', (_table, Repo) => {
  const make = (exists: boolean) => {
    const query = vi.fn().mockResolvedValue({ rows: [{ exists }] });
    return { repo: new Repo({ query } as unknown as Pool), query };
  };

  it('requires the creator to still be an active house member', async () => {
    const { repo, query } = make(true);

    expect(await repo.isCreator('rec-1', 'u-1')).toBe(true);

    const sql = query.mock.calls[0]![0] as string;
    expect(sql).toContain('house_members');
    expect(sql).toContain('left_at IS NULL');
    expect(query.mock.calls[0]![1]).toEqual(['rec-1', 'u-1']);
  });

  it('is false when the query finds no active-member creator row', async () => {
    const { repo } = make(false);

    expect(await repo.isCreator('rec-1', 'u-1')).toBe(false);
  });
});
