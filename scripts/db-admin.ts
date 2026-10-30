/**
 * DB admin CLI — create a user or reset a user's password.
 *
 * Run: yarn db:admin
 *
 * Select environment (dev/prod) → loads .env.<env> → connects with POSTGRES_*.
 * ponytail: standalone Pool (server/utils/postgres.ts needs Nuxt useRuntimeConfig).
 */

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { hash } from 'bcrypt';
import { Pool } from 'pg';
import {
  intro,
  outro,
  select,
  text,
  password as passwordPrompt,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
} from '@clack/prompts';

// Match the app's PostgresAuthProvider so CLI-created hashes are compatible.
const SALT_ROUNDS = 12;

function bail(message: string): never {
  cancel(message);
  process.exit(1);
}

/** Exit cleanly if the user hit Ctrl-C on a prompt. */
function guard<T>(value: T | symbol): T {
  if (isCancel(value)) bail('Cancelled.');
  return value as T;
}

function loadEnv(env: 'development' | 'production'): void {
  const file = resolve(process.cwd(), `.env.${env}`);
  if (!existsSync(file)) {
    bail(`Missing ${file} — create it with POSTGRES_* vars for "${env}".`);
  }
  process.loadEnvFile(file); // Node >= 20.12
}

function createPool(env: 'development' | 'production'): Pool {
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DATABASE, POSTGRES_USER } =
    process.env;

  const POSTGRES_CA_CERT = 'database/prod-ca-2021.crt';
  if (!POSTGRES_HOST || !POSTGRES_DATABASE || !POSTGRES_USER) {
    bail(
      'Incomplete config: POSTGRES_HOST / POSTGRES_DATABASE / POSTGRES_USER required.',
    );
  }
  // Managed prod (Supabase pooler) requires SSL; local dev does not.
  const isLocal =
    POSTGRES_HOST === '127.0.0.1' || POSTGRES_HOST === 'localhost';
  const useSsl = env === 'production' && !isLocal;
  let ssl: false | { ca: string } = false;
  if (useSsl) {
    if (!POSTGRES_CA_CERT || !existsSync(POSTGRES_CA_CERT)) {
      bail(
        'POSTGRES_CA_CERT not set or file not found. Download the CA cert from ' +
          'Supabase dashboard → Project Settings → Database → SSL Configuration ' +
          '("prod-ca-2021.crt"), then set POSTGRES_CA_CERT=/path/to/prod-ca-2021.crt in .env.production.',
      );
    }
    ssl = { ca: readFileSync(POSTGRES_CA_CERT, 'utf8') };
  }
  return new Pool({
    host: POSTGRES_HOST,
    port: Number.parseInt(POSTGRES_PORT || '5432', 10),
    database: POSTGRES_DATABASE,
    user: POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD || '',
    ssl,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
}

function promptEmail(): Promise<string> {
  return text({
    message: 'Email',
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'Invalid email',
  }) as Promise<string>;
}

async function createUser(pool: Pool): Promise<void> {
  const email = guard(await promptEmail())
    .trim()
    .toLowerCase();
  const firstName = guard(
    await text({
      message: 'First name',
      validate: (v) => (v.trim() ? undefined : 'Required'),
    }),
  ).trim();
  const lastName = guard(
    await text({
      message: 'Last name',
      validate: (v) => (v.trim() ? undefined : 'Required'),
    }),
  ).trim();
  const pwd = guard(
    await passwordPrompt({
      message: 'Password',
      validate: (v) => (v.length >= 8 ? undefined : 'Min 8 chars'),
    }),
  );

  const s = spinner();
  s.start('Creating user');
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);
    if (existing.rows.length > 0) {
      s.stop('User already exists', 1);
      return;
    }
    const passwordHash = await hash(pwd, SALT_ROUNDS);
    // email_confirmed_at = NOW() so the account is pre-confirmed and can log in
    // immediately (signIn rejects users with NULL email_confirmed_at).
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, email_confirmed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
       RETURNING id`,
      [randomUUID(), email, passwordHash, firstName, lastName],
    );
    s.stop(`User created (confirmed): ${result.rows[0].id}`);
  } catch (err) {
    s.stop('Failed', 1);
    throw err;
  }
}

async function resetPassword(pool: Pool): Promise<void> {
  const email = guard(await promptEmail())
    .trim()
    .toLowerCase();

  const found = await pool.query(
    'SELECT id, email FROM users WHERE email = $1',
    [email],
  );
  if (found.rows.length === 0) {
    bail(`No user with email ${email}.`);
  }
  log.info(`Found user ${found.rows[0].id}`);

  const pwd = guard(
    await passwordPrompt({
      message: 'New password',
      validate: (v) => (v.length >= 8 ? undefined : 'Min 8 chars'),
    }),
  );
  const ok = guard(await confirm({ message: `Update password for ${email}?` }));
  if (!ok) bail('Cancelled.');

  const s = spinner();
  s.start('Updating password');
  try {
    const passwordHash = await hash(pwd, SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
      [found.rows[0].id, passwordHash],
    );
    s.stop('Password updated.');
  } catch (err) {
    s.stop('Failed', 1);
    throw err;
  }
}

async function main(): Promise<void> {
  intro('House-m8 DB admin');

  const env = guard(
    await select({
      message: 'Environment',
      options: [
        { value: 'development', label: 'development (local)' },
        { value: 'production', label: 'production (production)' },
      ],
    }),
  ) as 'development' | 'production';

  if (env === 'production') {
    const sure = guard(
      await confirm({
        message: '⚠️  PRODUCTION database — continue?',
        initialValue: false,
      }),
    );
    if (!sure) bail('Cancelled.');
  }

  loadEnv(env);
  const pool = createPool(env);

  try {
    const action = guard(
      await select({
        message: 'Action',
        options: [
          { value: 'create', label: 'Create user' },
          { value: 'reset', label: 'Reset password' },
        ],
      }),
    ) as 'create' | 'reset';

    if (action === 'create') await createUser(pool);
    else await resetPassword(pool);

    outro('Done.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  cancel(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
