import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { transferHouseOwnership } from '~~/server/utils/house-ownership';

vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));

describe('transferHouseOwnership', () => {
  const transferOwnership = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      houses: { transferOwnership },
    } as never);
  });

  it('400 when transferring to yourself, without touching the repository', async () => {
    await expect(transferHouseOwnership('h', 'a', 'a')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(transferOwnership).not.toHaveBeenCalled();
  });

  it('logs ownership_transferred for the previous owner on success', async () => {
    transferOwnership.mockResolvedValue({ error: null });
    await transferHouseOwnership('h', 'a', 'b');
    expect(transferOwnership).toHaveBeenCalledWith('h', 'a', 'b');
    expect(logSecurityEvent).toHaveBeenCalledWith('ownership_transferred', {
      userId: 'a',
    });
  });

  it.each([
    ['NOT_OWNER', 403],
    ['MEMBER_NOT_FOUND', 404],
    ['something else', 500],
  ])('maps repository error %s to %i and logs nothing', async (error, code) => {
    transferOwnership.mockResolvedValue({ error });
    await expect(transferHouseOwnership('h', 'a', 'b')).rejects.toMatchObject({
      statusCode: code,
    });
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });
});
