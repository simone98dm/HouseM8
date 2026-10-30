/**
 * Minimal dev-only demo seed — creates a demo user (or reuses one if it
 * already exists), makes sure that user has a house, and tops up a few
 * expenses/bills so `yarn dev` has something to show.
 *
 * Run: yarn db:seed
 *
 * Idempotent: every step checks for existing data first, so re-running never
 * duplicates rows. Dev only — refuses to run without .env.development.
 * ponytail: standalone Pool (server/utils/postgres.ts needs Nuxt useRuntimeConfig).
 */

import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { hash } from 'bcrypt';
import { Pool } from 'pg';

// Match the app's PostgresAuthProvider so the seeded hash is compatible.
const SALT_ROUNDS = 12;

const DEMO_USER = {
  email: 'simone@house-m8.local',
  password: 'MockDemo1!',
  firstName: 'Simone',
  lastName: 'Demo',
};
const DEMO_HOUSE_NAME = 'Demo House';
const DEMO_EXPENSES = [
  { description: 'Groceries', amount: 64.5 },
  { description: 'Internet bill', amount: 39.99 },
  { description: 'Cleaning supplies', amount: 18.2 },
];
const DEMO_BILLS = [
  { description: 'Electricity', cost: 85 },
  { description: 'Water', cost: 22 },
];

function loadEnv(): void {
  const file = resolve(process.cwd(), '.env.development');
  if (!existsSync(file)) {
    console.error(`Missing ${file} — this seed only runs against local dev.`);
    process.exit(1);
  }
  process.loadEnvFile(file); // Node >= 20.12
}

function createPool(): Pool {
  const {
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DATABASE,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
  } = process.env;
  if (!POSTGRES_HOST || !POSTGRES_DATABASE || !POSTGRES_USER) {
    console.error(
      'Incomplete .env.development: POSTGRES_HOST / POSTGRES_DATABASE / POSTGRES_USER required.',
    );
    process.exit(1);
  }
  return new Pool({
    host: POSTGRES_HOST,
    port: Number.parseInt(POSTGRES_PORT || '5432', 10),
    database: POSTGRES_DATABASE,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD || '',
    ssl: false, // local dev only, never used against production
    max: 2,
    connectionTimeoutMillis: 5000,
  });
}

async function ensureUser(pool: Pool): Promise<string> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
    DEMO_USER.email,
  ]);
  if (existing.rows.length > 0) {
    console.log(`Demo user already exists: ${existing.rows[0].id}`);
    return existing.rows[0].id;
  }

  const passwordHash = await hash(DEMO_USER.password, SALT_ROUNDS);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, email_confirmed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())`,
    [
      id,
      DEMO_USER.email,
      passwordHash,
      DEMO_USER.firstName,
      DEMO_USER.lastName,
    ],
  );
  console.log(`Created demo user ${DEMO_USER.email} (${id})`);
  return id;
}

/** Reuse the user's existing active house membership if there is one, so a
 * re-run against an already-seeded (or manually patched) dev DB never
 * creates a second house for the demo account. */
async function ensureHouse(pool: Pool, ownerId: string): Promise<string> {
  const existing = await pool.query(
    `SELECT h.id FROM houses h
     JOIN house_members hm ON hm.house_id = h.id
     WHERE hm.user_id = $1 AND hm.left_at IS NULL
     ORDER BY hm.joined_at ASC
     LIMIT 1`,
    [ownerId],
  );
  if (existing.rows.length > 0) {
    console.log(`Demo user already has a house: ${existing.rows[0].id}`);
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await pool.query(
    `INSERT INTO houses (id, name, address, currency, owner_id, created_at, updated_at)
     VALUES ($1, $2, $3, 'EUR', $4, NOW(), NOW())`,
    [id, DEMO_HOUSE_NAME, '1 Demo Street', ownerId],
  );
  await pool.query(
    `INSERT INTO house_members (house_id, user_id, role, joined_at)
     VALUES ($1, $2, 'owner', NOW())`,
    [id, ownerId],
  );
  console.log(`Created demo house "${DEMO_HOUSE_NAME}" (${id})`);
  return id;
}

async function ensureExpenses(
  pool: Pool,
  houseId: string,
  userId: string,
): Promise<void> {
  const existing = await pool.query(
    'SELECT COUNT(*) FROM expenses WHERE house_id = $1',
    [houseId],
  );
  if (Number(existing.rows[0].count) > 0) {
    console.log('House already has expenses, skipping.');
    return;
  }

  for (const expense of DEMO_EXPENSES) {
    const expenseId = randomUUID();
    await pool.query(
      `INSERT INTO expenses (id, house_id, created_by, description, total_amount, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'EUR', NOW(), NOW())`,
      [expenseId, houseId, userId, expense.description, expense.amount],
    );
    await pool.query(
      `INSERT INTO expense_shares (id, expense_id, user_id, amount_due, is_paid)
       VALUES ($1, $2, $3, $4, false)`,
      [randomUUID(), expenseId, userId, expense.amount],
    );
  }
  console.log(`Created ${DEMO_EXPENSES.length} demo expenses.`);
}

async function ensureBills(
  pool: Pool,
  houseId: string,
  userId: string,
): Promise<void> {
  const existing = await pool.query(
    'SELECT COUNT(*) FROM bills WHERE house_id = $1',
    [houseId],
  );
  if (Number(existing.rows[0].count) > 0) {
    console.log('House already has bills, skipping.');
    return;
  }

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 14);
  const dueDateStr = nextDueDate.toISOString().slice(0, 10);

  for (const bill of DEMO_BILLS) {
    await pool.query(
      `INSERT INTO bills (id, house_id, description, monthly_cost, next_due_date, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [randomUUID(), houseId, bill.description, bill.cost, dueDateStr, userId],
    );
  }
  console.log(`Created ${DEMO_BILLS.length} demo bills.`);
}

async function main(): Promise<void> {
  loadEnv();
  const pool = createPool();
  try {
    const userId = await ensureUser(pool);
    const houseId = await ensureHouse(pool, userId);
    await ensureExpenses(pool, houseId, userId);
    await ensureBills(pool, houseId, userId);
    console.log(
      `\nDemo login ready:\n  email:    ${DEMO_USER.email}\n  password: ${DEMO_USER.password}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
