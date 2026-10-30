import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { repoQuery, repoPaginated } from '../../repositories/postgres/utils';

describe('repoQuery', () => {
  it('returns { data, error: null } on success', async () => {
    const result = await repoQuery(async () => 'hello');
    expect(result).toEqual({ data: 'hello', error: null });
  });

  it('returns { data: null, error: message } on thrown Error', async () => {
    const result = await repoQuery(async () => {
      throw new Error('db timeout');
    });
    expect(result).toEqual({ data: null, error: 'db timeout' });
  });

  it('returns { data: null, error: "Unknown error" } on non-Error throw', async () => {
    const result = await repoQuery(async () => {
      throw 'string error';
    });
    expect(result).toEqual({ data: null, error: 'Unknown error' });
  });
});

describe('repoQuery database error sanitising', () => {
  const pgError = (code: string, message: string) =>
    Object.assign(new Error(message), { code });

  it('maps unique violations to a message matching /duplicate key|unique/', async () => {
    const result = await repoQuery(async () => {
      throw pgError('23505', 'duplicate key value violates "users_email_key"');
    });
    expect(result.error).toBe('duplicate key');
  });

  it('maps malformed identifiers to "Invalid identifier"', async () => {
    const result = await repoQuery(async () => {
      throw pgError('22P02', 'invalid input syntax for type uuid: "x"');
    });
    expect(result.error).toBe('Invalid identifier');
  });

  it('hides other pg errors behind "Database error"', async () => {
    const result = await repoQuery(async () => {
      throw pgError('42703', 'column "secret_col" does not exist');
    });
    expect(result.error).toBe('Database error');
  });

  it('passes deliberate application errors through unchanged', async () => {
    const result = await repoQuery(async () => {
      throw new Error('CODE_LOCKED');
    });
    expect(result.error).toBe('CODE_LOCKED');
  });

  it('sanitises errors in repoPaginated too', async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(pgError('42P01', 'relation "x"')),
    } as unknown as Pool;
    const result = await repoPaginated(pool, 'c', 'd', []);
    expect(result.error).toBe('Database error');
  });
});

describe('repoPaginated', () => {
  const makePool = (countRows: object[], dataRows: object[]) => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: countRows })
      .mockResolvedValueOnce({ rows: dataRows });
    return { query } as unknown as Pool;
  };

  it('returns { data: [], total: 0 } on empty result', async () => {
    const pool = makePool([{ count: '0' }], []);
    const result = await repoPaginated(pool, 'SELECT COUNT(*)', 'SELECT *', [
      'h1',
    ]);
    expect(result).toEqual({ data: [], error: null, total: 0 });
  });

  it('parses total from count row', async () => {
    const pool = makePool([{ count: '42' }], [{ id: 1 }, { id: 2 }]);
    const result = await repoPaginated(pool, 'SELECT COUNT(*)', 'SELECT *', [
      'h1',
    ]);
    expect(result.total).toBe(42);
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it('appends limit and offset to data query params', async () => {
    const pool = makePool([{ count: '5' }], []);
    await repoPaginated(pool, 'SELECT COUNT(*)', 'SELECT *', ['h1'], {
      limit: 10,
      offset: 20,
    });
    expect(pool.query).toHaveBeenNthCalledWith(2, 'SELECT *', ['h1', 10, 20]);
  });

  it('uses default limit=50 offset=0 when options omitted', async () => {
    const pool = makePool([{ count: '1' }], []);
    await repoPaginated(pool, 'SELECT COUNT(*)', 'SELECT *', ['h1']);
    expect(pool.query).toHaveBeenNthCalledWith(2, 'SELECT *', ['h1', 50, 0]);
  });

  it('returns error response on db failure', async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as Pool;
    const result = await repoPaginated(pool, 'SELECT COUNT(*)', 'SELECT *', []);
    expect(result).toEqual({
      data: [],
      error: 'connection refused',
      total: 0,
    });
  });
});
