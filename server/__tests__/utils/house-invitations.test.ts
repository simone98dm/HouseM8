import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { sendMemberInviteEmail } from '~~/server/emails';
import { hitRateLimit } from '~~/server/utils/rate-limit-store';
import { hashToken } from '~~/server/utils/tokens';

vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/emails', () => ({
  sendMemberInviteEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('~~/server/utils/rate-limit-store', () => ({ hitRateLimit: vi.fn() }));

const { createHouseInvite } = await import('../../utils/house-invitations');

const invite = (inviteeEmail: string | null) =>
  createHouseInvite({
    houseId: 'h-1',
    inviter: { id: 'u-1', email: 'owner@b.c' },
    inviteeEmail,
  });

describe('createHouseInvite — per-recipient mail cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        createInvitation: vi.fn().mockResolvedValue({
          data: { id: 'inv-1', token: 'tok', expires_at: '2030-01-01' },
          error: null,
        }),
        attachInviteCode: vi.fn().mockResolvedValue({
          data: { code: '123456', code_expires_at: '2030-01-01' },
          error: null,
        }),
        getById: vi.fn().mockResolvedValue({ data: { name: 'Home' } }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({ data: { first_name: 'Ann' } }),
      },
    } as never);
  });

  it('mails the invitee and counts under a hashed, case-insensitive key', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(1);
    await invite('Guest@B.c');
    expect(hitRateLimit).toHaveBeenCalledWith(
      `invite-mail:${hashToken('guest@b.c')}`,
      3600,
    );
    expect(sendMemberInviteEmail).toHaveBeenCalledTimes(1);
  });

  it('still creates the invitation but sends no mail past the cap', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(4);
    const result = await invite('guest@b.c');
    expect(result.token).toBe('tok');
    expect(sendMemberInviteEmail).not.toHaveBeenCalled();
  });

  it('does not count when there is no recipient', async () => {
    await invite(null);
    expect(hitRateLimit).not.toHaveBeenCalled();
    expect(sendMemberInviteEmail).not.toHaveBeenCalled();
  });
});
