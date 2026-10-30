import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const setResponseHeaders = vi.fn();
vi.stubGlobal('setResponseHeaders', setResponseHeaders);

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));

describe('GET /api/gdpr/export', () => {
  const ev = {} as never;
  const recordExportRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      gdpr: {
        recordExportRequest,
        exportUserData: vi.fn().mockResolvedValue({ user: { id: 'u-1' } }),
      },
      securityEvents: {
        listByUser: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'e1',
              user_id: 'u-1',
              event: 'signin_success',
              ip_hash: 'secret-hash',
              created_at: 't',
            },
          ],
          error: null,
        }),
      },
    } as never);
  });

  it('merges own security events (without ip hashes), records the request and event', async () => {
    const { default: h } = await import('../../../api/gdpr/export.get');
    const out = (await (h as (e: unknown) => Promise<object>)(ev)) as Record<
      string,
      unknown
    >;

    expect(out.security_events).toEqual([
      { event: 'signin_success', created_at: 't' },
    ]);
    expect(JSON.stringify(out)).not.toContain('secret-hash');
    expect(recordExportRequest).toHaveBeenCalledWith('u-1');
    expect(logSecurityEvent).toHaveBeenCalledWith('data_export', {
      userId: 'u-1',
      event: ev,
    });
  });

  it('sends an attachment Content-Disposition with a dated filename', async () => {
    const { default: h } = await import('../../../api/gdpr/export.get');
    await (h as (e: unknown) => Promise<unknown>)(ev);

    const headers = setResponseHeaders.mock.calls[0]![1] as Record<
      string,
      string
    >;
    expect(headers['Content-Disposition']).toMatch(
      /^attachment; filename="house-m8-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(headers['Content-Type']).toContain('application/json');
  });
});
