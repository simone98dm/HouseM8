import { describe, it, expect, afterEach, vi } from 'vitest';
import { getStorageProvider } from '~~/server/providers/storage/factory';

describe('storage provider GDPR gate', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns the stub when no provider is enabled', () => {
    expect(getStorageProvider().getPublicUrl('b', 'x')).toBe('');
  });

  it('throws naming the gate when a provider is enabled without acknowledgement', () => {
    vi.stubEnv('STORAGE_PROVIDER', 's3');
    expect(() => getStorageProvider()).toThrow(/EXIF\/GPS.*private.*erasure/s);
  });

  it('allows an enabled provider once acknowledged', () => {
    vi.stubEnv('STORAGE_PROVIDER', 's3');
    vi.stubEnv('STORAGE_GDPR_GATE_ACK', 'true');
    expect(() => getStorageProvider()).not.toThrow();
  });
});

describe('stub storage provider', () => {
  it('reports "not configured" for upload, delete and deleteMany, and never returns a url', async () => {
    const s = getStorageProvider() as unknown as Record<
      string,
      (...a: unknown[]) => Promise<{ data?: unknown; error: string }>
    >;
    expect(await s.upload!('b', 'p', Buffer.from('x'))).toMatchObject({
      data: null,
      error: expect.stringContaining('not configured'),
    });
    expect(await s.delete!('b', 'p')).toMatchObject({
      error: expect.stringContaining('not configured'),
    });
    expect(await s.deleteMany!('b', ['p'])).toMatchObject({
      error: expect.stringContaining('not configured'),
    });
  });

  it.each(['', 'none'])('treats STORAGE_PROVIDER=%j as disabled', (v) => {
    vi.stubEnv('STORAGE_PROVIDER', v);
    expect(() => getStorageProvider()).not.toThrow();
    vi.unstubAllEnvs();
  });
});
