# Setup & Running Locally

---

## Requirements

| Tool         | Minimum version | Notes                          |
| ------------ | --------------- | ------------------------------ |
| Node.js      | 20 LTS          | 22 LTS recommended             |
| Yarn         | 1.22+           | `npm i -g yarn`                |
| PostgreSQL   | 15              | Docker preferred for local dev |
| Supabase CLI | latest          | For migration management only  |

---

## 1. Clone and Install

```bash
git clone https://github.com/simone98dm/house-m8-fe.git
cd house-m8-fe
yarn
```

`postinstall` runs `nuxt prepare` automatically after install.

---

## 2. Database

### Option A — Docker (recommended)

```bash
docker compose up -d
```

This starts PostgreSQL 16 on `localhost:5432` with:

- user: `postgres`
- password: `postgres`
- database: `house_m8`

### Option B — Supabase local

```bash
supabase start
```

Supabase CLI applies all migrations from `supabase/migrations/` automatically and exposes a Studio UI at `http://localhost:54323`.

### Apply migrations manually

```bash
psql -U postgres -d house_m8 -f database/001_initial_schema.sql
psql -U postgres -d house_m8 -f database/002_seed.sql
psql -U postgres -d house_m8 -f database/003_update_occupation_type_constraint.sql
psql -U postgres -d house_m8 -f database/004_add_user_preferred_currency.sql
psql -U postgres -d house_m8 -f database/005_reports_schema.sql
psql -U postgres -d house_m8 -f database/005_subscriptions.sql
psql -U postgres -d house_m8 -f database/006_bill_reminders.sql
psql -U postgres -d house_m8 -f database/007_referral_rewards.sql
psql -U postgres -d house_m8 -f database/008_monthly_reports.sql
psql -U postgres -d house_m8 -f database/009_house_status.sql
psql -U postgres -d house_m8 -f database/010_gdpr.sql
psql -U postgres -d house_m8 -f database/012_categories.sql
```

---

## 3. Environment Variables

Copy the example file and fill in values:

```bash
cp .env.example .env
```

### Required

| Variable         | Description                                                                           |
| ---------------- | ------------------------------------------------------------------------------------- |
| `POSTGRES_URL`   | Full connection string, e.g. `postgresql://postgres:postgres@localhost:5432/house_m8` |
| `JWT_SECRET`     | Random string, minimum 32 characters                                                  |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) for transactional email                 |
| `EMAIL_FROM`     | Sender address, e.g. `House M8 <noreply@housem8.app>`                                 |

### Optional — individual connection params (alternative to `POSTGRES_URL`)

| Variable            | Default     |
| ------------------- | ----------- |
| `POSTGRES_HOST`     | `localhost` |
| `POSTGRES_PORT`     | `5432`      |
| `POSTGRES_DATABASE` | `house_m8`  |
| `POSTGRES_USER`     | `postgres`  |
| `POSTGRES_PASSWORD` | _(empty)_   |

### Optional — Google OAuth

| Variable               | Description                              |
| ---------------------- | ---------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Google Cloud Console OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console secret              |

Google OAuth callback URL to register: `http://localhost:3000/api/auth/google/callback`

### Optional — Stripe billing

| Variable                      | Description                       |
| ----------------------------- | --------------------------------- |
| `STRIPE_SECRET_KEY`           | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET`       | Stripe webhook signing secret     |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | Price ID for Pro monthly plan     |
| `STRIPE_PRICE_ID_PRO_ANNUAL`  | Price ID for Pro annual plan      |

For local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Optional — other

| Variable                | Default                 | Description                                                                                       |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `CRON_SECRET`           | —                       | Auth header value for cron endpoints                                                              |
| `CONFIGCAT_SDK_KEY`     | —                       | ConfigCat SDK key; unset = all flags off                                                          |
| `BASE_URL`              | `http://localhost:3000` | Public URL (used in OAuth redirects and emails)                                                   |
| `STORAGE_PROVIDER`      | `none`                  | File uploads; any value other than `none` needs `STORAGE_GDPR_GATE_ACK=true` (see `.env.example`) |
| `STORAGE_GDPR_GATE_ACK` | `false`                 | Set only after EXIF stripping, private-by-default and erasure coverage exist                      |

---

## 4. Seed Data

```bash
yarn db:seed        # populate with sample houses, users, expenses
```

Or use the two-step flow:

```bash
yarn seed:setup     # preview what will be seeded
yarn seed:execute   # execute for real
```

---

## 5. Run

```bash
yarn dev            # http://localhost:3000 with hot reload
```

Nuxt DevTools are enabled by default — open via the floating button in the bottom-right corner.

---

## Available Scripts

```bash
# Development
yarn dev                  # dev server + hot reload
yarn build                # production build
yarn preview              # serve production build locally
yarn generate             # static site generation

# Code Quality
yarn typecheck            # TypeScript type check
yarn lint                 # Prettier (format)
yarn lint:check           # Prettier (check only)
yarn eslint               # ESLint
yarn eslint:fix           # ESLint with auto-fix

# Testing
yarn test                 # all tests (unit + integration + api)
yarn test:unit            # components, composables, stores
yarn test:integration     # pages with mocked APIs
yarn test:api             # server endpoints + repositories
yarn test:watch           # Vitest watch mode
yarn test:ui              # Vitest browser UI
yarn test:coverage        # coverage report
yarn test:e2e             # Cypress end-to-end (needs running dev server)
yarn test:e2e:open        # Cypress interactive UI
yarn test:e2e:headed      # Cypress headed run

# Analysis
yarn lighthouse           # Lighthouse CI audit
yarn lighthouse:dev       # Single Lighthouse run against localhost:3000
yarn sonar                # SonarQube scan (needs SONAR_TOKEN + running SonarQube)

# Email
yarn generate-emails      # Build and preview email templates
```

---

## Production Deployment

The recommended platform is **Vercel** (zero-config Nuxt 4 support).

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

For the Stripe webhook, register `https://yourdomain.com/api/stripe/webhook` in the Stripe dashboard and set `STRIPE_WEBHOOK_SECRET` accordingly.

For cron jobs, add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/bills-reminder", "schedule": "0 9 * * *" },
    { "path": "/api/cron/monthly-reports", "schedule": "0 0 1 * *" }
  ]
}
```

Pass `CRON_SECRET` as a header in the Vercel cron configuration to protect the endpoints.

---

## Code Quality Gates

| Gate                          | Command           | Enforced         |
| ----------------------------- | ----------------- | ---------------- |
| Commit message format         | `commitlint`      | Git hook (Husky) |
| Lint + format on staged files | `lint-staged`     | Git hook (Husky) |
| TypeScript                    | `yarn typecheck`  | CI               |
| Tests                         | `yarn test`       | CI               |
| SonarQube                     | `yarn sonar`      | CI (optional)    |
| Lighthouse                    | `yarn lighthouse` | Local only       |
