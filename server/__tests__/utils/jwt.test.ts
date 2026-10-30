import { vi, describe, it, expect } from 'vitest';

vi.stubGlobal('useRuntimeConfig', () => ({
  jwtSecret: 'test-jwt-secret-must-be-at-least-32chars!!',
}));

// Mock getPostgresPool so generateRefreshToken doesn't need a real DB
vi.mock('~~/server/utils/postgres', () => ({
  getPostgresPool: () => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }),
}));

const { generateAccessToken, generateRefreshToken, verifyToken } =
  await import('../../utils/jwt');

describe('server/utils/jwt', () => {
  const TEST_USER_ID = 'user-123';
  const TEST_EMAIL = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should return a JWT string with three parts', async () => {
      const token = await generateAccessToken(TEST_USER_ID, TEST_EMAIL);

      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should produce a token that verifyToken can decode with correct payload', async () => {
      const token = await generateAccessToken(TEST_USER_ID, TEST_EMAIL);
      const payload = await verifyToken(token, 'access');

      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(TEST_USER_ID);
      expect(payload!.email).toBe(TEST_EMAIL);
    });

    it('should include iat and exp in the verified payload', async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await generateAccessToken(TEST_USER_ID, TEST_EMAIL);
      const after = Math.floor(Date.now() / 1000);
      const payload = await verifyToken(token, 'access');

      expect(payload!.iat).toBeGreaterThanOrEqual(before);
      expect(payload!.iat).toBeLessThanOrEqual(after);
      // Access token expires in 15 minutes = 900 seconds
      expect(payload!.exp).toBeGreaterThan(payload!.iat!);
      expect(payload!.exp! - payload!.iat!).toBeLessThanOrEqual(900);
    });

    it('should generate different tokens for different users', async () => {
      const token1 = await generateAccessToken('user-1', 'a@example.com');
      const token2 = await generateAccessToken('user-2', 'b@example.com');

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a JWT string with three parts', async () => {
      const token = await generateRefreshToken(TEST_USER_ID, TEST_EMAIL);

      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should produce a token that verifyToken can decode with correct payload', async () => {
      const token = await generateRefreshToken(TEST_USER_ID, TEST_EMAIL);
      const payload = await verifyToken(token, 'refresh');

      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(TEST_USER_ID);
      expect(payload!.email).toBe(TEST_EMAIL);
    });

    it('should have a longer expiry than an access token', async () => {
      const accessToken = await generateAccessToken(TEST_USER_ID, TEST_EMAIL);
      const refreshToken = await generateRefreshToken(TEST_USER_ID, TEST_EMAIL);

      const accessPayload = await verifyToken(accessToken, 'access');
      const refreshPayload = await verifyToken(refreshToken, 'refresh');

      // Refresh token (7 days) should expire later than access token (15 min)
      expect(refreshPayload!.exp).toBeGreaterThan(accessPayload!.exp!);
    });

    it('should generate different tokens for different users', async () => {
      const token1 = await generateRefreshToken('user-1', 'a@example.com');
      const token2 = await generateRefreshToken('user-2', 'b@example.com');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should return null for an empty string', async () => {
      const result = await verifyToken('', 'access');

      expect(result).toBeNull();
    });

    it('should return null for a random invalid string', async () => {
      const result = await verifyToken('not.a.valid.jwt.token', 'access');

      expect(result).toBeNull();
    });

    it('should return null for a malformed token', async () => {
      const result = await verifyToken('header.payload', 'access');

      expect(result).toBeNull();
    });

    it('should return null for a token signed with a different secret', async () => {
      // Build a token manually signed with a different secret
      const { SignJWT } = await import('jose');
      const wrongSecret = new TextEncoder().encode(
        'wrong-secret-that-is-not-the-same-at-all!!',
      );
      const bogusToken = await new SignJWT({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(wrongSecret);

      const result = await verifyToken(bogusToken, 'access');

      expect(result).toBeNull();
    });

    it('should return null when expectedTyp does not match token typ', async () => {
      const accessToken = await generateAccessToken(TEST_USER_ID, TEST_EMAIL);
      const result = await verifyToken(accessToken, 'refresh');

      expect(result).toBeNull();
    });

    it('should return a payload with userId, email, iat, and exp for a valid token', async () => {
      const token = await generateAccessToken(TEST_USER_ID, TEST_EMAIL);
      const payload = await verifyToken(token, 'access');

      expect(payload).not.toBeNull();
      expect(payload).toMatchObject({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
      });
      expect(typeof payload!.iat).toBe('number');
      expect(typeof payload!.exp).toBe('number');
    });
  });
});
