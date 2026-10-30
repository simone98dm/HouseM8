import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const getRouterParamMock = vi.fn();
vi.stubGlobal('getRouterParam', getRouterParamMock);
vi.stubGlobal('createError', (p: { statusCode: number }) =>
  Object.assign(new Error('err'), p),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));

const TOKEN = '3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f';
const getInvitationPreview = vi.fn();
const run = async () =>
  (
    (await import('../../../api/invitation/[token]/preview.get')).default as (
      e: unknown,
    ) => Promise<unknown>
  )({});

describe('GET /api/invitation/:token/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue(TOKEN);
    vi.mocked(getRepositories).mockReturnValue({
      houses: { getInvitationPreview },
    } as never);
  });

  it('works without authentication and returns only name and count', async () => {
    getInvitationPreview.mockResolvedValue({
      data: {
        house_name: 'Via Roma',
        member_count: 3,
        address: '1 Secret St',
        members: ['a@b.c'],
      },
    });
    const res = await run();
    expect(res).toEqual({ data: { house_name: 'Via Roma', member_count: 3 } });
    expect(getInvitationPreview).toHaveBeenCalledWith(TOKEN);
  });

  it('404s for unknown, used or expired tokens (repository returns no data)', async () => {
    getInvitationPreview.mockResolvedValue({ error: 'Invitation not found' });
    await expect(run()).rejects.toMatchObject({ statusCode: 404 });
  });

  it('400s a malformed token without touching the database', async () => {
    getRouterParamMock.mockReturnValue("x' OR 1=1");
    await expect(run()).rejects.toMatchObject({ statusCode: 400 });
    expect(getInvitationPreview).not.toHaveBeenCalled();
  });
});
