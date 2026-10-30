import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { hashIp, hashToken } from '~~/server/utils/tokens';

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('consola', () => ({
  default: {
    error: vi.fn(),
    withTag: () => ({ error: vi.fn(), info: vi.fn() }),
  },
}));

const record = vi.fn();

describe('logSecurityEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    record.mockResolvedValue({ data: null, error: null });
    vi.mocked(getRepositories).mockReturnValue({
      securityEvents: { record },
    } as never);
  });

  it('stores a hash of the IP, never the IP', async () => {
    await logSecurityEvent('signin_failed', { userId: 'u1', ip: '1.2.3.4' });
    expect(record).toHaveBeenCalledWith(
      'signin_failed',
      'u1',
      hashIp('1.2.3.4'),
      null,
    );
  });

  it('uses a keyed hash, not plain SHA-256', async () => {
    await logSecurityEvent('signup', { ip: '1.2.3.4' });
    const stored = record.mock.calls[0]![2];
    expect(stored).not.toBe(hashToken('1.2.3.4'));
    expect(stored).toBe(hashIp('1.2.3.4'));
  });

  it('records null ip hash and user when nothing is known', async () => {
    await logSecurityEvent('signup');
    expect(record).toHaveBeenCalledWith('signup', null, null, null);
  });

  it('forwards metadata', async () => {
    await logSecurityEvent('role_changed', {
      userId: 'actor',
      metadata: { target_user_id: 't' },
    });
    expect(record).toHaveBeenCalledWith('role_changed', 'actor', null, {
      target_user_id: 't',
    });
  });

  it('never throws when the repo rejects or returns an error', async () => {
    record.mockRejectedValueOnce(new Error('down'));
    await expect(logSecurityEvent('signup')).resolves.toBeUndefined();
    record.mockResolvedValueOnce({ data: null, error: 'x' });
    await expect(logSecurityEvent('signup')).resolves.toBeUndefined();
  });

  it('never throws when repositories are not initialised', async () => {
    vi.mocked(getRepositories).mockImplementation(() => {
      throw new Error('not init');
    });
    await expect(logSecurityEvent('signup')).resolves.toBeUndefined();
  });
});
