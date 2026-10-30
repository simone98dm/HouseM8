import { describe, it, expect, vi, beforeEach } from 'vitest';

const jwt = vi.hoisted(() => ({
  getUserFromToken: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
  refreshAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  verifyToken: vi.fn(),
}));
vi.mock('../../utils/jwt', () => jwt);
vi.mock('~~/server/emails', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('new-hash'),
  compare: vi.fn(async (pw: string) => pw === 'right'),
}));
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));
const fetchMock = vi.fn();
vi.stubGlobal('$fetch', fetchMock);

const { PostgresAuthProvider } =
  await import('../../providers/auth/PostgresAuthProvider');
const { hashToken } = await import('../../utils/tokens');
const { sendPasswordResetEmail } = await import('~~/server/emails');

const makePool = () => {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) };
  return { pool, client };
};

describe('PostgresAuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('confirmOAuthSession', () => {
    const run = async (verified: boolean | undefined) => {
      const { pool } = makePool();
      pool.query.mockResolvedValue({ rows: [] });
      fetchMock.mockResolvedValue({
        id: 'g',
        email: 'x@gmail.com',
        verified_email: verified,
      });
      const result = await new PostgresAuthProvider(pool as never)
        .confirmOAuthSession!('tok', 'ref');
      return { result, pool };
    };

    it('returns null and creates nothing when Google email is unverified', async () => {
      for (const v of [false, undefined]) {
        const { result, pool } = await run(v);
        expect(result).toBeNull();
        expect(pool.query).not.toHaveBeenCalled();
      }
    });

    it('accepts a verified Google email', async () => {
      const { result } = await run(true);
      expect(result?.user.email).toBe('x@gmail.com');
    });
  });

  describe('signOut', () => {
    const event = {} as never;

    it('revokes via the refresh cookie when the access token is gone', async () => {
      const { pool } = makePool();
      jwt.getUserFromToken.mockResolvedValue(null);
      jwt.getRefreshToken.mockReturnValue('rt');
      jwt.verifyToken.mockResolvedValue({ userId: 'u-9', email: 'a@b.c' });

      await new PostgresAuthProvider(pool as never).signOut(event);

      expect(jwt.verifyToken).toHaveBeenCalledWith('rt', 'refresh');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at'),
        ['u-9'],
      );
      expect(jwt.clearAuthCookies).toHaveBeenCalled();
    });

    it('uses the access token user when present', async () => {
      const { pool } = makePool();
      jwt.getUserFromToken.mockResolvedValue({ userId: 'u-1' });

      await new PostgresAuthProvider(pool as never).signOut(event);

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['u-1']);
      expect(jwt.getRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('verification tokens', () => {
    it('stores only the hash but returns the raw token', async () => {
      const { pool } = makePool();
      pool.query.mockImplementation(
        async (_sql: string, params: unknown[]) => ({
          rows: [
            {
              token: params[2],
              user_id: params[1],
              email: params[3],
              expires_at: params[4],
              created_at: 'now',
            },
          ],
        }),
      );

      const created = await new PostgresAuthProvider(
        pool as never,
      ).createEmailVerificationToken('u-1', 'a@b.c');

      const storedValue = pool.query.mock.calls[0]![1][2];
      expect(created!.token).not.toBe(storedValue);
      expect(storedValue).toBe(hashToken(created!.token));
    });

    it('confirmEmailVerificationToken looks up and burns by hash', async () => {
      const { pool, client } = makePool();
      client.query.mockImplementation(async (sql: string) =>
        sql.includes('SELECT user_id, email')
          ? { rows: [{ user_id: 'u-1', email: 'new@b.c' }] }
          : { rows: [] },
      );

      const out = await new PostgresAuthProvider(
        pool as never,
      ).confirmEmailVerificationToken('raw');

      // users row has no email here, so this counts as a change of address
      expect(out).toEqual({
        userId: 'u-1',
        email: 'new@b.c',
        isEmailChange: true,
        passwordSet: false,
      });
      const withToken = client.query.mock.calls.filter(
        (c) => c[1]?.[0] === hashToken('raw'),
      );
      expect(withToken).toHaveLength(2); // SELECT + UPDATE used_at
      expect(client.query.mock.calls.some((c) => c[1]?.includes('raw'))).toBe(
        false,
      );
    });

    const confirmFor = async (currentEmail: string) => {
      const { pool, client } = makePool();
      client.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT user_id, email'))
          return { rows: [{ user_id: 'u-1', email: 'new@b.c' }] };
        if (sql.includes('FROM users WHERE id'))
          return { rows: [{ email: currentEmail, has_password: true }] };
        return { rows: [] };
      });
      const out = await new PostgresAuthProvider(
        pool as never,
      ).confirmEmailVerificationToken('raw');
      const ran = (needle: string) =>
        client.query.mock.calls.some((c) => (c[0] as string).includes(needle));
      return { out, ran };
    };

    const confirmSignUp = async (hasPassword: boolean, password?: string) => {
      const { pool, client } = makePool();
      client.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT user_id, email'))
          return { rows: [{ user_id: 'u-1', email: 'a@b.c' }] };
        if (sql.includes('FROM users WHERE id'))
          return { rows: [{ email: 'a@b.c', has_password: hasPassword }] };
        return { rows: [] };
      });
      const out = await new PostgresAuthProvider(
        pool as never,
      ).confirmEmailVerificationToken('raw', password);
      const ran = (needle: string) =>
        client.query.mock.calls.some((c) => (c[0] as string).includes(needle));
      return { out, ran, client };
    };

    it('a sign-up with no password asks for one and leaves the token unused', async () => {
      const { out, ran } = await confirmSignUp(false);
      expect(out).toBe('password_required');
      expect(ran('ROLLBACK')).toBe(true);
      expect(ran('email_confirmed_at')).toBe(false);
      expect(ran('used_at = NOW()')).toBe(false);
    });

    it('stores the first password in the same transaction as the confirmation', async () => {
      const { out, client } = await confirmSignUp(false, 'longenough');
      expect(out).toMatchObject({ isEmailChange: false, passwordSet: true });
      const sqls = client.query.mock.calls.map((c) => c[0] as string);
      const setPw = sqls.findIndex((q) => q.includes('SET password_hash'));
      expect(setPw).toBeGreaterThan(sqls.indexOf('BEGIN'));
      expect(setPw).toBeLessThan(sqls.indexOf('COMMIT'));
      const call = client.query.mock.calls[setPw]!;
      expect(call[1]).toEqual(['u-1', 'new-hash']);
    });

    it('never overwrites an existing password from a confirmation link', async () => {
      const { out, ran } = await confirmSignUp(true, 'attacker-choice');
      expect(out).toMatchObject({ passwordSet: false });
      expect(ran('SET password_hash')).toBe(false);
    });

    it('a sign-up confirmation is not an email change and keeps sessions', async () => {
      const { out, ran } = await confirmFor('New@B.c');
      expect(out?.isEmailChange).toBe(false);
      expect(ran('UPDATE refresh_tokens')).toBe(false);
    });

    it('an email change ends every session and voids other pending links', async () => {
      const { out, ran } = await confirmFor('old@b.c');
      expect(out?.isEmailChange).toBe(true);
      expect(ran('UPDATE refresh_tokens SET revoked_at')).toBe(true);
      expect(ran('DELETE FROM email_verification_tokens')).toBe(true);
    });
  });

  describe('password reset', () => {
    it('sendPasswordReset stores the hash and emails the raw token', async () => {
      const { pool } = makePool();
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'u-1', first_name: 'A', last_name: 'B' }],
        })
        .mockResolvedValueOnce({ rows: [] }) // no recent reset token
        .mockResolvedValueOnce({ rows: [] });

      await new PostgresAuthProvider(pool as never).sendPasswordReset('a@b.c');

      const stored = pool.query.mock.calls[2]![1][2] as string;
      const { resetLink } = vi.mocked(sendPasswordResetEmail).mock.calls[0]![0];
      const raw = resetLink.split('token=')[1]!;
      expect(stored).not.toBe(raw);
      expect(stored).toBe(hashToken(raw));
    });

    it('sendPasswordReset sends nothing while a recent token exists', async () => {
      const { pool } = makePool();
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'u-1', first_name: 'A', last_name: 'B' }],
        })
        .mockResolvedValueOnce({ rows: [{}] }); // token issued inside cooldown

      const ok = await new PostgresAuthProvider(
        pool as never,
      ).sendPasswordReset('a@b.c');

      expect(ok).toBe(true); // same answer to the caller
      expect(pool.query).toHaveBeenCalledTimes(2); // no INSERT
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('resetPassword voids pending verification / email-change links', async () => {
      const { pool, client } = makePool();
      client.query.mockImplementation(async (sql: string) =>
        sql.includes('FROM password_reset_tokens')
          ? { rows: [{ user_id: 'u-1' }] }
          : { rows: [] },
      );

      await new PostgresAuthProvider(pool as never).resetPassword('raw', 'pw');

      const sqls = client.query.mock.calls.map((c) => c[0] as string);
      const del = sqls.findIndex((s) =>
        s.includes('DELETE FROM email_verification_tokens'),
      );
      expect(del).toBeGreaterThan(-1);
      expect(del).toBeLessThan(sqls.indexOf('COMMIT'));
    });

    it('resetPassword looks up by hash and revokes sessions before COMMIT', async () => {
      const { pool, client } = makePool();
      client.query.mockImplementation(async (sql: string) =>
        sql.includes('SELECT user_id')
          ? { rows: [{ user_id: 'u-1' }] }
          : { rows: [] },
      );

      const ok = await new PostgresAuthProvider(pool as never).resetPassword(
        'raw',
        'newpw',
      );

      expect(ok).toBe(true);
      const sqls = client.query.mock.calls.map((c) => String(c[0]));
      const revokeIdx = sqls.findIndex((q) =>
        q.includes('UPDATE refresh_tokens'),
      );
      const commitIdx = sqls.indexOf('COMMIT');
      expect(revokeIdx).toBeGreaterThan(-1);
      expect(revokeIdx).toBeLessThan(commitIdx);
      expect(client.query.mock.calls.some((c) => c[1]?.[0] === 'raw')).toBe(
        false,
      );
      expect(
        client.query.mock.calls.filter((c) => c[1]?.[0] === hashToken('raw')),
      ).toHaveLength(2);
    });
  });

  describe('verifyPassword / getUnconfirmedUserByEmail', () => {
    it('distinguishes valid, invalid and no password', async () => {
      const { pool } = makePool();
      const provider = new PostgresAuthProvider(pool as never);
      pool.query.mockResolvedValue({ rows: [{ password_hash: 'h' }] });
      expect(await provider.verifyPassword('u', 'right')).toBe('valid');
      expect(await provider.verifyPassword('u', 'wrong')).toBe('invalid');
      pool.query.mockResolvedValue({ rows: [{ password_hash: null }] });
      expect(await provider.verifyPassword('u', 'right')).toBe('no_password');
    });

    it('queries only unconfirmed users', async () => {
      const { pool } = makePool();
      pool.query.mockResolvedValue({ rows: [] });
      const out = await new PostgresAuthProvider(
        pool as never,
      ).getUnconfirmedUserByEmail('a@b.c');
      expect(out).toBeNull();
      expect(pool.query.mock.calls[0]![0]).toContain(
        'email_confirmed_at IS NULL',
      );
    });
  });
});
