/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hitRateLimit } from '~~/server/utils/rate-limit-store';
import { hashIp, hashToken } from '~~/server/utils/tokens';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));
const setResponseHeaderMock = vi.fn();
vi.stubGlobal('setResponseHeader', setResponseHeaderMock);
const readBodyMock = vi.fn();
vi.stubGlobal('readBody', readBodyMock);
const getRequestIPMock = vi.fn();
vi.stubGlobal('getRequestIP', getRequestIPMock);

vi.mock('~~/server/utils/rate-limit-store', () => ({ hitRateLimit: vi.fn() }));
vi.mock('consola', async (orig) => {
  const actual = await orig<typeof import('consola')>();
  return { default: Object.assign(actual.default, { error: vi.fn() }) };
});

const ev = (path: string, method = 'POST') =>
  ({
    path,
    method,
    node: { req: { socket: { remoteAddress: '10.0.0.1' } } },
  }) as never;

async function run(path: string, method = 'POST') {
  const { default: handler } = await import('../../middleware/rate-limit');
  return (handler as Function)(ev(path, method));
}

const IP = hashIp('1.2.3.4');
const keys = () => vi.mocked(hitRateLimit).mock.calls.map((c) => c[0]);

describe('rate-limit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hitRateLimit).mockResolvedValue(1);
    getRequestIPMock.mockReturnValue('1.2.3.4');
    readBodyMock.mockResolvedValue({ email: ' Victim@Example.com ' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores unlimited routes', async () => {
    await run('/api/bills');
    expect(hitRateLimit).not.toHaveBeenCalled();
  });

  it('caps settlement undo at 10 per hour per IP', async () => {
    const path = '/api/houses/h-1/settlements/s-1/undo';
    await run(path);
    expect(keys()).toEqual([`ip:settlement-undo:${IP}`]);
    expect(vi.mocked(hitRateLimit).mock.calls[0]![1]).toBe(3600);

    vi.mocked(hitRateLimit).mockResolvedValue(11);
    await expect(run(path)).rejects.toMatchObject({ statusCode: 429 });
  });

  it('caps settle at 20 per hour per IP', async () => {
    await run('/api/houses/h-1/settle');
    expect(keys()).toEqual([`ip:settle:${IP}`]);
    vi.mocked(hitRateLimit).mockResolvedValue(21);
    await expect(run('/api/houses/h-1/settle')).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('throttles the public invitation preview per IP (GET opt-in)', async () => {
    await run(
      '/api/invitation/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f/preview',
      'GET',
    );
    expect(keys()).toEqual([`ip:invitation-preview:${IP}`]);
  });

  it('refuses the preview with 429 past its cap', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(31);
    await expect(
      run(
        '/api/invitation/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f/preview',
        'GET',
      ),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it('never throttles reads, even on a limited path', async () => {
    await run('/api/houses/abc-123/members', 'GET');
    expect(hitRateLimit).not.toHaveBeenCalled();
  });

  it('keys signin on ip, then on hashed email+ip, never on email alone', async () => {
    await run('/api/auth/signin');
    expect(keys()).toEqual([
      `ip:signin:${IP}`,
      `signin:${hashToken('victim@example.com')}:${IP}`,
    ]);
  });

  it('does not touch the email counter once the source is blocked', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(11);
    await expect(run('/api/auth/signin')).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(keys()).toEqual([`ip:signin:${IP}`]);
  });

  it('builds no key from an email alone (no remote lockout of an address)', async () => {
    await run('/api/auth/register');
    await run('/api/auth/password-reset/request');
    expect(keys()).toEqual([`ip:register:${IP}`, `ip:password-reset:${IP}`]);
  });

  it('does not key password-reset/confirm on email', async () => {
    await run('/api/auth/password-reset/confirm');
    expect(keys()).toEqual([`ip:password-reset:${IP}`]);
  });

  it.each([
    ['/api/auth/confirm', `ip:confirm:${IP}`],
    ['/api/users/me/email', `ip:email-change:${IP}`],
    ['/api/houses/abc-123/invitation/generate', `ip:invite:${IP}`],
    ['/api/houses/abc-123/members', `ip:invite:${IP}`],
  ])('limits %s per ip with its own budget', async (path, key) => {
    await run(path);
    expect(keys()).toEqual([key]);
  });

  it('does not limit other house sub-routes', async () => {
    await run('/api/houses/abc-123/members/u1/role');
    await run('/api/houses/abc-123');
    expect(hitRateLimit).not.toHaveBeenCalled();
  });

  it('lets the first requests through without delay', async () => {
    vi.useFakeTimers();
    vi.mocked(hitRateLimit).mockResolvedValue(5);
    let done = false;
    const pending = run('/api/auth/refresh').then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    await pending;
  });

  it('slows requests down past the soft threshold', async () => {
    vi.useFakeTimers();
    vi.mocked(hitRateLimit).mockResolvedValue(7); // 2 over -> 1000ms
    let done = false;
    const pending = run('/api/auth/refresh').then(() => (done = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    await pending;
  });

  it('caps the delay', async () => {
    vi.useFakeTimers();
    vi.mocked(hitRateLimit).mockResolvedValue(10); // 5 over -> capped at 2000ms
    let done = false;
    const pending = run('/api/auth/refresh').then(() => (done = true));
    await vi.advanceTimersByTimeAsync(2000);
    expect(done).toBe(true);
    await pending;
  });

  it('blocks with 429 and Retry-After once the count exceeds the max', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(11);
    await expect(run('/api/auth/refresh')).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      expect.anything(),
      'Retry-After',
      60,
    );
  });

  it('falls back to the socket address when no forwarded IP', async () => {
    getRequestIPMock.mockReturnValue(undefined);
    await run('/api/auth/refresh');
    expect(keys()).toEqual([`ip:refresh:${hashIp('10.0.0.1')}`]);
  });

  it('fails open when the store throws', async () => {
    vi.mocked(hitRateLimit).mockRejectedValue(new Error('db down'));
    await expect(run('/api/auth/refresh')).resolves.toBeUndefined();
  });

  it.each([
    ['/api/gdpr/export', 'GET', 'gdpr-export'],
    ['/api/gdpr/delete-account', 'POST', 'gdpr-delete'],
    ['/api/stripe/withdraw', 'POST', 'stripe-withdraw'],
  ])('limits %s %s hourly', async (path, method, name) => {
    await run(path, method);
    expect(keys()).toEqual([`ip:${name}:${IP}`]);
    expect(hitRateLimit).toHaveBeenCalledWith(expect.any(String), 3600);
  });

  it('blocks GDPR routes after 5 hits per hour', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(6);
    await expect(run('/api/gdpr/export', 'GET')).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      expect.anything(),
      'Retry-After',
      3600,
    );
  });

  it('does not throttle other GDPR reads or the export via POST', async () => {
    await run('/api/gdpr/export', 'POST');
    await run('/api/gdpr/cancel-delete', 'POST');
    expect(hitRateLimit).not.toHaveBeenCalled();
  });

  it('applies the GDPR limit to the path with a query string or trailing slash', async () => {
    await run('/api/gdpr/export/?x=1', 'GET');
    expect(keys()).toEqual([`ip:gdpr-export:${IP}`]);
  });

  it.each([
    ['/api/gdpr/export-all', 'GET'],
    ['/api/gdpr/delete-account/extra', 'POST'],
    ['/api/stripe/withdrawal', 'POST'],
    ['/api/stripe/checkout', 'POST'],
  ])('does not throttle look-alike path %s', async (path, method) => {
    await run(path, method);
    expect(hitRateLimit).not.toHaveBeenCalled();
  });

  it('allows exactly the max for withdraw (5) and blocks the 6th', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(5);
    await expect(run('/api/stripe/withdraw')).resolves.toBeUndefined();
    vi.mocked(hitRateLimit).mockResolvedValue(6);
    await expect(run('/api/stripe/withdraw')).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('allows exactly 5 account deletions per hour and blocks the 6th', async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(5);
    await expect(run('/api/gdpr/delete-account')).resolves.toBeUndefined();
    vi.mocked(hitRateLimit).mockResolvedValue(6);
    await expect(run('/api/gdpr/delete-account')).rejects.toMatchObject({
      statusCode: 429,
    });
  });
});
