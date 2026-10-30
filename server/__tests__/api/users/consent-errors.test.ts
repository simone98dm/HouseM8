import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

const body = vi.fn();
const param = vi.fn();
vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal('getRouterParam', () => param());
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, parse: (b: unknown) => unknown) => parse(body()),
);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage?: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn(),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const event = {} as never;
const repos = (r: Record<string, unknown>) =>
  vi.mocked(getRepositories).mockReturnValue(r as never);

describe('consent / terms endpoints: error and audit paths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(verifyAuthCompat).mockResolvedValue({ id: 'u1' } as never);
  });

  describe('POST accept-terms', () => {
    const load = async () =>
      (await import('../../../api/users/me/accept-terms.post')).default;
    const ok = {
      terms_accepted: true,
      privacy_acknowledged: true,
      age_confirmed: true,
    };

    it('stamps the server policy version and ignores client versions', async () => {
      const update = vi
        .fn()
        .mockResolvedValue({ data: { id: 'u1' }, error: null });
      repos({ users: { update } });
      body.mockReturnValue({ ...ok, consent_version: 0 });
      await expect((await load())(event)).resolves.toEqual({
        data: { id: 'u1' },
      });
      expect(update).toHaveBeenCalledWith('u1', {
        terms_accepted_at: expect.any(String),
        consent_version: LEGAL_POLICY_VERSION,
      });
    });

    it.each(['terms_accepted', 'privacy_acknowledged', 'age_confirmed'])(
      'rejects when %s is not true',
      async (k) => {
        const update = vi.fn();
        repos({ users: { update } });
        body.mockReturnValue({ ...ok, [k]: false });
        await expect((await load())(event)).rejects.toBeDefined();
        expect(update).not.toHaveBeenCalled();
      },
    );

    it('500 when update fails', async () => {
      repos({
        users: {
          update: vi.fn().mockResolvedValue({ data: null, error: 'x' }),
        },
      });
      body.mockReturnValue(ok);
      await expect((await load())(event)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it('500 when update returns no row', async () => {
      repos({
        users: {
          update: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      });
      body.mockReturnValue(ok);
      await expect((await load())(event)).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe('POST consents', () => {
    const load = async () =>
      (await import('../../../api/users/me/consents.post')).default;

    it('logs consent_granted on success', async () => {
      repos({
        consents: {
          grant: vi.fn().mockResolvedValue({ data: { id: 'c' }, error: null }),
        },
      });
      body.mockReturnValue({ purpose: 'profile_sharing' });
      await (
        await load()
      )(event);
      expect(logSecurityEvent).toHaveBeenCalledWith('consent_granted', {
        userId: 'u1',
        event,
      });
    });

    it('500 and no audit event when grant fails', async () => {
      repos({
        consents: {
          grant: vi.fn().mockResolvedValue({ data: null, error: 'x' }),
        },
      });
      body.mockReturnValue({ purpose: 'profile_sharing' });
      await expect((await load())(event)).rejects.toMatchObject({
        statusCode: 500,
      });
      expect(logSecurityEvent).not.toHaveBeenCalled();
    });
  });

  describe('DELETE consents/[purpose]', () => {
    const load = async () =>
      (await import('../../../api/users/me/consents/[purpose].delete')).default;

    it('withdraws and logs consent_withdrawn', async () => {
      const withdraw = vi.fn().mockResolvedValue({ error: null });
      repos({ consents: { withdraw } });
      param.mockReturnValue('profile_sharing');
      await expect((await load())(event)).resolves.toEqual({ success: true });
      expect(withdraw).toHaveBeenCalledWith('u1', 'profile_sharing');
      expect(logSecurityEvent).toHaveBeenCalledWith('consent_withdrawn', {
        userId: 'u1',
        event,
      });
    });

    it.each(['withdrawal_waiver', '', undefined])(
      '400 for invalid purpose %s',
      async (p) => {
        const withdraw = vi.fn();
        repos({ consents: { withdraw } });
        param.mockReturnValue(p);
        await expect((await load())(event)).rejects.toMatchObject({
          statusCode: 400,
        });
        expect(withdraw).not.toHaveBeenCalled();
      },
    );

    it('500 and no audit event when withdraw fails', async () => {
      repos({
        consents: { withdraw: vi.fn().mockResolvedValue({ error: 'x' }) },
      });
      param.mockReturnValue('profile_sharing');
      await expect((await load())(event)).rejects.toMatchObject({
        statusCode: 500,
      });
      expect(logSecurityEvent).not.toHaveBeenCalled();
    });
  });
});
