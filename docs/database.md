# Database

House M8 uses **PostgreSQL 16** with raw parameterized queries via the `pg` Node.js driver. There is no ORM.

---

## Schema Overview

```
users
  ├── house_members ──────────────────► houses
  │                                       ├── expenses ──► expense_shares
  │                                       ├── bills
  │                                       ├── bulletin_notes
  │                                       ├── house_invitations
  │                                       └── reports
  ├── email_verification_tokens
  ├── password_reset_tokens
  ├── oauth_tokens
  ├── subscriptions
  ├── user_consents
  ├── security_events
  └── referrals
```

---

## Core Tables

### `users`

Primary user table. Authentication is handled by the app itself (bcrypt passwords + JWT), not delegated to a third-party auth service.

| Column                                 | Type                 | Notes                                                                                                                                  |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                   | UUID PK              | `gen_random_uuid()`                                                                                                                    |
| `email`                                | TEXT UNIQUE          |                                                                                                                                        |
| `password_hash`                        | TEXT                 | bcrypt hash; null for OAuth-only accounts                                                                                              |
| `first_name`, `last_name`              | TEXT                 |                                                                                                                                        |
| `avatar_url`                           | TEXT                 |                                                                                                                                        |
| `email_confirmed_at`                   | TIMESTAMPTZ          | null until verified                                                                                                                    |
| `preferred_currency`                   | TEXT                 | added in migration 004                                                                                                                 |
| `is_first_access`                      | BOOLEAN              | first-login onboarding flag                                                                                                            |
| `terms_accepted_at`, `consent_version` | TIMESTAMPTZ, INTEGER | GDPR; `consent_version` is the integer `LEGAL_POLICY_VERSION`                                                                          |
| `deleted_at`                           | TIMESTAMPTZ          | set while a deletion is pending (30-day grace period)                                                                                  |
| Profile fields                         | TEXT                 | bio, gender, occupation_type, languages, pets, phone, social handles, etc. Shown to housemates only with the `profile_sharing` consent |

`birthplace`, `nationality`, `birthdate` and `is_smoker` were dropped (data minimization). `first_name` is nullable (email-only sign-up).

### `user_consents`

One row per consent grant: `user_id`, `purpose` (`profile_sharing` | `withdrawal_waiver`), `version` (integer policy version), `granted_at`, `withdrawn_at`. A partial unique index allows one active (`withdrawn_at IS NULL`) row per `(user_id, purpose)`; withdrawn rows are kept as history. RLS enabled, no access for `anon`/`authenticated`. Withdrawing `profile_sharing` also nulls the optional profile fields in `users`.

### `security_events`

Audit trail (Art. 32): `user_id` (nullable, `ON DELETE SET NULL`), `event` (CHECK list: sign-in success/failure, signup, password reset, data export, deletion requested/cancelled, account pseudonymized, role change, ownership transfer, consent granted/withdrawn, subscription withdrawn), `ip_hash` (never the raw IP), `metadata` JSONB, `created_at`. The `gdpr-cleanup` cron purges rows older than 12 months.

### `gdpr_requests`

Also records exports. Deletion requests store `archived_house_ids` (houses archived with the user, restored on cancel) and `stripe_cancel_scheduled`. `pseudonymize_user()` additionally deletes the user's `bulletin_notes`, `reports` and `report_images`, and sets `left_at` on their memberships. The `comments` table no longer exists.

### `houses`

```sql
CREATE TABLE houses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    address     TEXT,
    currency    TEXT CHECK (currency IN ('USD', 'EUR')) DEFAULT 'EUR',
    max_members INTEGER DEFAULT 10,
    owner_id    UUID REFERENCES users(id) ON DELETE CASCADE
);
```

### `house_members`

Join table — a user can belong to multiple houses and rejoin after leaving (`left_at` column enables historical records while the unique constraint on `(house_id, user_id, left_at)` prevents duplicate active memberships).

### `expenses` and `expense_shares`

```sql
-- Parent record: who created it and the total
CREATE TABLE expenses (
    id             UUID PRIMARY KEY,
    house_id       UUID REFERENCES houses(id) ON DELETE CASCADE,
    created_by     UUID REFERENCES users(id) ON DELETE CASCADE,
    total_amount   NUMERIC(10,2) CHECK (total_amount > 0),
    currency       TEXT DEFAULT 'EUR',
    recurring      BOOLEAN DEFAULT FALSE,
    recurring_period TEXT CHECK (recurring_period IN ('weekly','monthly','yearly')),
    categories     TEXT[] DEFAULT '{}'     -- ≤ 3 keys from shared/constants/categories.ts
);

-- One row per participant
CREATE TABLE expense_shares (
    id          UUID PRIMARY KEY,
    expense_id  UUID REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_due  NUMERIC(10,2) CHECK (amount_due >= 0),
    is_paid     BOOLEAN DEFAULT FALSE,
    paid_at     TIMESTAMPTZ,
    UNIQUE(expense_id, user_id)
);
```

When an expense is created the repository inserts the parent row and then one `expense_shares` row per `user_id` with `amount_due = total_amount / count(user_ids)`. All inserts run inside a single transaction.

### `bills`

Recurring fixed-cost bills (rent, internet, etc.) with a `payment_period` in months (1, 2, 6, or 12). `next_due_date` is advanced by the cron job after each payment cycle.

Both `expenses` and `bills` have `categories TEXT[]` (up to 3 distinct keys: groceries, rent, utilities, subscriptions, transport, dining, household, health, entertainment, travel, gifts, other; migration `20261028100000_expense_categories_recurring.sql`, which also converts the old single `category` column from `database/012_categories.sql` if present).

### `bulletin_notes`

House-scoped sticky notes with an optional `dismiss_date`.

### `reports`

Member-to-owner issue reports. Owners can mark them read/solved and upload images (stored URL in `report_images` table added in migration 005).

---

## Migrations

All migrations live in `supabase/migrations/` (source of truth for schema changes). The `database/` folder contains the original standalone PostgreSQL scripts for reference.

```
001_initial_schema.sql   — core tables
002_seed.sql             — development seed data
003_*                    — occupation type constraint fix
004_add_user_preferred_currency.sql
005_reports_schema.sql   — reports + images
005_subscriptions.sql    — Stripe subscription tables
006_bill_reminders.sql   — bill reminder tracking
007_referral_rewards.sql — referral system
008_monthly_reports.sql  — pre-aggregated monthly summaries
009_house_status.sql     — house active/archived status
010_gdpr.sql             — GDPR export/deletion tables
012_categories.sql       — categories[] on expenses and bills (in database/)
20261026000000_email_only_signup.sql
20261026100000_profile_minimization.sql — drops birthplace/nationality/birthdate/is_smoker (IRREVERSIBLE, back up first)
20261026110000_user_consents.sql        — user_consents, consent_version text -> integer
20261026120000_security_events.sql      — security audit trail
20261026130000_erasure_completeness.sql — pseudonymize_user() covers UGC + memberships; drops comments
20261026140000_clear_google_avatars.sql — clears avatars copied from Google
```

Apply locally:

```bash
supabase start      # applies all migrations automatically
# or
supabase db reset   # drop + reapply all migrations
```

---

## Connection Management

The server creates a singleton `pg.Pool` at startup via `getPostgresPool()`. The pool is initialized in the Nitro server plugin and injected into the repository factory:

```typescript
// server/plugins/postgres.ts (simplified)
const pool = getPostgresPool(config);
initializeRepositories(pool);
```

All queries go through `executeQuery()` which acquires a client from the pool, runs the query with parameters, and releases the client. Transactions use `executeTransaction()` which wraps multiple statements in `BEGIN` / `COMMIT` / `ROLLBACK`.

---

## Balance Calculation

The `PostgresBalanceRepository.getHouseBalance()` computes net balances in SQL:

1. Aggregate `SUM(amount_due)` per user where `is_paid = false` → what they owe.
2. Aggregate `SUM(amount_due)` per user from expenses they created and that others owe → what others owe them.
3. Compute `net_balance = owed_to_user - user_owes`.
4. Derive the fewest-transfers settlement plan: users with a negative net balance pay users with a positive one.

SQL only reads the expenses/shares rows; balances and the settlement plan are computed in TS (integer cents) by `shared/utils/{balance,settlement}.ts` on top of the vendored `shared/split-engine` (branch-and-bound minimal-payments search, 40k-iteration / 2 s budget).

---

## Switching the Database

Because all SQL is inside `server/repositories/postgres/Postgres*.ts` and every class implements a pure TypeScript interface:

1. Write `server/repositories/mysql/Mysql*.ts` implementing the same interfaces.
2. Add `createMysqlRepositories(pool)` in `factory.ts`.
3. Change the server plugin to create a MySQL pool and call `initializeRepositories(mysqlPool)`.

No endpoint, store, composable, or component changes. The interfaces (`server/repositories/interfaces/`) are the stable contract.
