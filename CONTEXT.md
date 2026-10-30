# CONTEXT — House M8

High-level context for anyone (human or agent) picking up this project cold.
For _how_ to build within it see [ARCHITECTURE.md](ARCHITECTURE.md); for contribution
rules see [CONTRIBUTING.md](CONTRIBUTING.md); for agents see [AGENTS.md](AGENTS.md).

## What it is

**House M8** is a shared-living finance web app for roommates. It removes the
"who owes what" friction in a shared house: log shared expenses, track recurring
bills, see a live per-person balance, settle debts in the fewest transfers, and
keep everyone in the loop via a bulletin board and issue reports.

It is a full-stack Nuxt 4 app — Vue 3 SPA/PWA frontend and a Nitro server backed
by PostgreSQL — deployed on Vercel.

## The problem it solves

Roommates constantly front money for each other (rent, utilities, groceries) and
lose track of who paid and who still owes. House M8 makes the shared ledger
explicit, computes net balances automatically, and proposes a minimal settlement
plan so debts clear with the least number of transfers.

## Product goal & target users

- **Users:** people sharing a home — flatmates, roommates, co-tenants.
- **Goal:** one place to manage shared-house money and communication, low-friction
  enough that everyone in the house actually uses it.
- **Model:** multi-house, multi-tenant. A user can belong to several houses;
  each house has an **owner** and **members**. All data is scoped to its house.
- **Monetisation:** Stripe-powered subscription plans with feature gating.

## Features currently implemented

Derived from the code (`server/api/*`, `app/pages/*`, `app/stores/*`):

- **Expenses** — log a shared expense, split equally across selected housemates,
  track paid/owed per share, optional payer ("Paid by") and category, recurring expenses (weekly/monthly/yearly), filtering.
- **Bills** — recurring fixed costs (rent, internet, utilities) with configurable
  payment periods, optional category, due-date tracking, and reminders via a cron endpoint.
- **Balance** — real-time net balance per user and a fewest-transfers settlement
  plan (vendored `shared/split-engine`, integer cents); one-click settle between
  two users (debtor or creditor), and per-expense pay back, both immediate with a
  10s undo toast (`useUndoToast`; no confirm modal).
- **Houses** — create/switch multiple houses, owner/co-admin/member roles, invite by
  email or 6-digit code, member capacity, house status.
- **Bulletin board** — sticky notes for the house, optional per-note expiry,
  cleanup endpoint.
- **Reports** — members submit issue reports to the owner, attach images, mark
  read/solved. Monthly reports generated server-side.
- **Profile & settings** — name, avatar and optional profile fields (shown to
  housemates only while the `profile_sharing` consent is granted), per-user
  currency (EUR/USD), and GDPR controls (consents, data export download, account
  deletion with a 30-day grace period).
- **Auth** — email/password with verification, Google OAuth, JWT access + refresh
  tokens in HTTP-only cookies.
- **Subscriptions** — Stripe checkout (withdrawal waiver, Terms consent,
  VAT-inclusive prices), billing portal, in-app withdrawal, plan enforcement.
- **Referrals / rewards** — referral repository + rewards schema.
- **Platform** — dark mode (`@nuxtjs/color-mode`), i18n (English + Italian),
  feature flags (env or Vercel Edge Config), PWA.

## Privacy & compliance state

GDPR / EU consumer-law work is implemented (findings and remaining open items:
`docs/House-m8 — GDPR & EU Compliance Gap Analysis.md`; organizational documents:
`docs/legal/`).

- **Tables:** `user_consents` (purposes `profile_sharing`, `withdrawal_waiver`,
  versioned, withdrawal keeps history) and `security_events` (audit trail, hashed
  IP, purged after 12 months by the `gdpr-cleanup` cron). `users.birthplace`,
  `nationality`, `birthdate`, `is_smoker` and the `comments` table are dropped.
- **Legal policy version:** integer `LEGAL_POLICY_VERSION = 2` in
  `shared/utils/legal.ts` (`users.consent_version` is an integer). Bump it when a
  new processor, field or retention period changes the texts; users then
  re-accept. Business identity lives in `LEGAL_ENTITY` (`app/utils/legal/`) with
  `TODO` values until the business is set up.
- **Pending deletion:** a deletion request soft-deletes the user for 30 days
  (`deleted_at`). The account is hidden from housemates and crons, and the
  `pending-deletion` server middleware answers 403 `ACCOUNT_PENDING_DELETION`
  except for own profile, cancel, export, pending summary (`GET /api/gdpr/pending-summary`, per-house balances) and sign-out. Owners of houses with other
  members must transfer ownership first. After 30 days the cron pseudonymizes the
  user and redacts the Stripe customer.
- **New endpoints:** `/api/users/me/consents`, `/api/users/me/accept-terms`,
  `/api/stripe/prices`, `/api/stripe/withdraw`, `/api/gdpr/cancel-delete`,
  `GET /api/gdpr/export` (see [docs/api.md](docs/api.md)).
- **Storage:** uploads are off by default (`STORAGE_PROVIDER`); any other value
  needs `STORAGE_GDPR_GATE_ACK=true` (EXIF stripping, private-by-default and
  erasure coverage required first).

## Tech stack & key integrations

| Concern         | Choice                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Nuxt 4 (Vue 3.5 + Nitro server)                                                                                                        |
| Language        | TypeScript 5.7                                                                                                                         |
| State           | Pinia 3.x                                                                                                                              |
| Database        | PostgreSQL (`pg` driver, **no ORM**)                                                                                                   |
| Styling         | Tailwind CSS 3.4 + `@tailwindcss/forms` / `typography` <!-- TODO: confirm — some agent files say Tailwind 4; package.json pins 3.4 --> |
| Auth            | JWT via `jose` + `bcrypt` + Google OAuth                                                                                               |
| Validation      | Zod (all server inputs)                                                                                                                |
| Email           | Resend                                                                                                                                 |
| Payments        | Stripe                                                                                                                                 |
| PDF             | `pdf-lib` (client-side report export)                                                                                                  |
| Logging         | `consola`                                                                                                                              |
| Testing         | Vitest + Vue Test Utils (unit/integration/api) + Cypress (e2e)                                                                         |
| Deployment      | Vercel                                                                                                                                 |
| Package manager | **yarn**                                                                                                                               |

External services that must be configured to run the full app: PostgreSQL,
Google OAuth, Stripe, Resend, and (optionally) Vercel Edge Config. See
[docs/setup.md](docs/setup.md) and `.env.example`.

## Non-obvious things an agent must know

- **Multi-tenancy is mandatory.** Every query is scoped to its house (`house_id`).
  Never write a data path that can read or mutate another house's rows.
  <!-- TODO: confirm — CLAUDE.md describes scoping as `project_id`; the code paths use houseId -->
- **No raw SQL in endpoints.** All DB access goes through repositories
  (`server/repositories/postgres/*`) obtained from the repository factory.
- **No ORM.** Queries are hand-written parameterised SQL inside repositories.
- **Zod on every server input** — request bodies, params, and query are validated.
- **The DB is the source of truth for schema** via numbered SQL files in
  `database/` (`001_…` → `010_gdpr.sql`). `supabase/migrations/` is also committed.
- **No hardcoded user-facing strings.** Everything goes through `t('key')` with
  entries in both `i18n/locales/en.json` and `it.json`.
- **God nodes** (touch carefully — high fan-out): the Postgres repositories
  (`PostgresHouseRepository`, `PostgresAuthProvider`, …), the API client
  `enhancedFetch()`, and the composables `useApi` / `useHouses`. See
  [ARCHITECTURE.md](ARCHITECTURE.md) and `graphify-out/GRAPH_REPORT.md`.
- **A Graphify knowledge graph** lives in `graphify-out/`; prefer it for
  architecture questions before reading raw files.
