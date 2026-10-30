# Architecture Overview

House M8 is a full-stack application built on **Nuxt 4** — one codebase runs both the Vue 3 frontend (SSR/SPA) and the Nitro HTTP server. There is no separate backend service.

---

## The 4-Layer Rule

Every user action travels through exactly four layers, top to bottom. No layer may skip another.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1 — Component                                    │
│  app/components/**/*.vue                                │
│  Pure UI: renders data, emits events, no logic          │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — Page                                         │
│  app/pages/**/*.vue                                     │
│  Orchestrates: calls stores, owns route-level state     │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Store (Pinia)                                │
│  app/stores/*.ts                                        │
│  Business logic: validation, optimistic updates, toasts │
├─────────────────────────────────────────────────────────┤
│  Layer 4 — API Composable                               │
│  app/composables/use*Api.ts                             │
│  HTTP only: calls server via enhancedFetch(), maps DTOs │
└─────────────────────────────────────────────────────────┘
          ↕  HTTP (same-origin, cookie auth)
┌─────────────────────────────────────────────────────────┐
│  Server — API Endpoint                                  │
│  server/api/**/*.ts                                     │
│  Validates input (Zod), calls repositories, returns JSON│
├─────────────────────────────────────────────────────────┤
│  Server — Repository Interface                          │
│  server/repositories/interfaces/I*.ts                  │
│  TypeScript contract: defines allowed operations        │
├─────────────────────────────────────────────────────────┤
│  Server — Repository Implementation                     │
│  server/repositories/postgres/Postgres*.ts             │
│  PostgreSQL: parameterized queries, no business logic   │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 16                                          │
└─────────────────────────────────────────────────────────┘
```

### Why this works

**Strict layer contracts** mean that each layer has exactly one job. A component never knows whether data came from a cache or the network; a store never knows which SQL query ran. This makes every layer independently testable and replaceable.

---

## Repository Pattern — Database Portability

The repository layer is the single point of contact with the database. Every repository implements a TypeScript interface:

```typescript
// Interface — database-agnostic contract
export interface IExpenseRepository {
  getById(expenseId: string): Promise<RepositoryResponse<Expense>>;
  getByHouse(
    houseId: string,
    pagination: PaginationParams,
    filters?: ExpenseFilterOptions,
  ): Promise<PaginatedResponse<Expense>>;
  create(data: ExpenseCreateData): Promise<RepositoryResponse<Expense>>;
  update(
    expenseId: string,
    data: ExpenseUpdateData,
  ): Promise<RepositoryResponse<Expense>>;
  delete(expenseId: string): Promise<RepositoryResponse<void>>;
  // ...
}

// Implementation — PostgreSQL-specific
export class PostgresExpenseRepository implements IExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async getById(expenseId: string): Promise<RepositoryResponse<Expense>> {
    return repoQuery(async () => {
      const result = await this.pool.query(
        `SELECT e.*, ... FROM expenses e WHERE e.id = $1`,
        [expenseId],
      );
      // ...
    });
  }
}
```

The **Repository Factory** (`server/repositories/factory.ts`) wires the concrete implementation at startup and hands a `Repositories` object to every API handler:

```typescript
export function initializeRepositories(pool: Pool): void {
  repositories = createPostgresRepositories(pool);
}

export function getRepositories(): Repositories {
  return repositories!;
}
```

**Switching databases** (e.g. MySQL, SQLite, Supabase client) requires only:

1. Write a new class that implements each `I*Repository` interface.
2. Add a `createMysqlRepositories()` function in `factory.ts`.
3. Call `initializeRepositories()` with the new pool.

No endpoint, store, or composable needs to change.

---

## Key Server Utilities

| Utility                                            | File                                    | Purpose                                                   |
| -------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `executeQuery()` / `executeTransaction()`          | `server/utils/db.ts`                    | Wraps `pg` pool — all DB access goes here                 |
| `getPostgresPool()`                                | `server/utils/db.ts`                    | Singleton connection pool                                 |
| `repoQuery()`                                      | `server/repositories/postgres/utils.ts` | Standard try/catch wrapper — returns `{ data, error }`    |
| `verifyAuthCompat()`                               | `server/utils/repository-auth.ts`       | Extracts and validates JWT from cookie                    |
| `ensureHouseMember()` / `ensureHouseOwner()`       | `server/utils/repository-auth.ts`       | Authorization guards used in every endpoint               |
| `generateAccessToken()` / `generateRefreshToken()` | `server/utils/jwt.ts`                   | JWT creation (`jose`)                                     |
| `enhancedFetch()`                                  | `app/plugins/api.client.ts`             | Client-side fetch with retry, token refresh, error toasts |
| `sendEmail()`                                      | `server/utils/email.ts`                 | Resend SDK wrapper                                        |

---

## Multi-Tenancy

All data is scoped to a `house_id`. Every repository query that retrieves house-scoped data requires a `house_id` parameter, and every endpoint that operates on house resources calls `ensureHouseMember(houseId, user.id)` before touching the database.

This means a compromised JWT cannot access another household's data — the membership check is a separate database query, not just a decoded claim.

---

## Authentication Flow

```
1. POST /api/auth/signin   → verify email + bcrypt password
2. Server issues:
   - accessToken  (JWT, 15 min, HTTP-only cookie)
   - refreshToken (JWT, 30 days, HTTP-only cookie)
3. Client makes authenticated requests → cookie sent automatically
4. 401 received → enhancedFetch() calls POST /api/auth/refresh
5. Refresh succeeds → retry original request
6. Refresh fails → sign user out, redirect to /auth/login
```

Google OAuth follows the same ending: after the OAuth exchange, the server issues the same access/refresh JWT pair and sets the same cookies, so the frontend is unaware of the auth method.

---

## Request Lifecycle — Example: Create Expense

```
User submits form
  → ExpenseCreateModal.vue  (Layer 1 — emits 'submit')
  → expenses.vue page        (Layer 2 — calls expensesStore.createExpense())
  → useExpensesStore         (Layer 3 — validates amount > 0, prepares payload)
  → useExpensesApi           (Layer 4 — POST /api/expenses via enhancedFetch())
  → server/api/expenses/index.post.ts
      verifyAuthCompat(event)         → confirms JWT
      readValidatedBody(event, schema) → Zod validates body
      ensureHouseMember(houseId, uid)  → DB membership check
      repos.expenses.create(data)      → PostgresExpenseRepository
        pool.query(INSERT INTO expenses ...)
        pool.query(INSERT INTO expense_shares ...) × N users
  → returns { data: expense }
  → Layer 4 resolves with Expense object
  → Layer 3 unshifts expense into state, shows success toast
  → Layer 1 modal closes
```

---

## Feature Flags

Flags live in [ConfigCat](https://app.configcat.com) and are evaluated server-side only (`@configcat/sdk/node`, LazyLoad, 60s cache).

| Flag                 | Gates                                                    |
| -------------------- | -------------------------------------------------------- |
| `showStripe`         | Pricing/billing UI and every `/api/stripe/*` route (404) |
| `showSignup`         | Registration UI, `/api/auth/register`, Google OAuth      |
| `showProfilePicture` | Profile picture upload                                   |

- Server: `isFeatureEnabled(key)` from `server/utils/feature-flags.ts`.
- Client: `useFeatureFlags().isEnabled(key)`, hydrated from `GET /api/feature-flags` during SSR.
- The SDK key is `CONFIGCAT_SDK_KEY` (server-only runtime config). Missing key, network error or unknown flag → **off**.
- New flag: add it in ConfigCat and to `FEATURE_FLAG_KEYS`.
