import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildPoolConfig } from '~~/server/utils/postgres';
import { SUPABASE_CA_CERT } from '~~/server/utils/postgres-ca';

// Mutate the real Nuxt runtime config object (what the code under test reads).
let runtime: Record<string, string>;

const KEYS = [
  'POSTGRES_URL',
  'POSTGRES_HOST',
  'POSTGRES_SSL',
  'POSTGRES_CA_CERT',
];

describe('buildPoolConfig', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    runtime = useRuntimeConfig() as unknown as Record<string, string>;
    for (const k of KEYS) {
      saved[k] = process.env[k];
      Reflect.deleteProperty(process.env, k);
    }
    runtime.postgresUrl = '';
    runtime.postgresHost = '';
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) Reflect.deleteProperty(process.env, k);
      else process.env[k] = saved[k];
    }
  });

  it('uses connectionString when POSTGRES_URL is set, and enables verified TLS', () => {
    process.env.POSTGRES_URL = 'postgresql://u:p@db.example.com:5432/x';
    const c = buildPoolConfig();
    expect(c.connectionString).toContain('db.example.com');
    expect(c.host).toBeUndefined();
    expect(c.ssl).toEqual({ ca: SUPABASE_CA_CERT, rejectUnauthorized: true });
  });

  it('strips sslmode from the URL so it cannot weaken the ssl option', () => {
    process.env.POSTGRES_URL =
      'postgresql://u:p@db.example.com/x?sslmode=disable';
    expect(buildPoolConfig().connectionString).not.toContain('sslmode');
  });

  it('prefers runtime config postgresUrl', () => {
    runtime.postgresUrl = 'postgresql://u:p@rt.example.com/x';
    expect(buildPoolConfig().connectionString).toContain('rt.example.com');
  });

  it('uses discrete fields with TLS for a remote host', () => {
    process.env.POSTGRES_HOST = 'db.example.com';
    const c = buildPoolConfig();
    expect(c.host).toBe('db.example.com');
    expect(c.connectionString).toBeUndefined();
    expect(c.ssl).toMatchObject({ rejectUnauthorized: true });
  });

  it.each(['localhost', '127.0.0.1'])('skips TLS for %s', (h) => {
    process.env.POSTGRES_HOST = h;
    expect(buildPoolConfig().ssl).toBeUndefined();
  });

  it('skips TLS for a localhost URL', () => {
    process.env.POSTGRES_URL = 'postgresql://u:p@localhost:5432/x';
    expect(buildPoolConfig().ssl).toBeUndefined();
  });

  it('skips TLS only with POSTGRES_SSL=disable', () => {
    process.env.POSTGRES_HOST = 'db.example.com';
    process.env.POSTGRES_SSL = 'disable';
    expect(buildPoolConfig().ssl).toBeUndefined();
  });

  it('takes the CA from POSTGRES_CA_CERT when set', () => {
    process.env.POSTGRES_HOST = 'db.example.com';
    process.env.POSTGRES_CA_CERT = 'PEM-CONTENT';
    expect(buildPoolConfig().ssl).toEqual({
      ca: 'PEM-CONTENT',
      rejectUnauthorized: true,
    });
  });
});
