# ARCHITECTURE — House M8

Everything an agent needs to design an implementation that fits the existing
codebase. For the _why_ and feature list see [CONTEXT.md](CONTEXT.md); for naming
and commit rules see [CONTRIBUTING.md](CONTRIBUTING.md).

## Architectural style

A **strict layered architecture** on both sides of the Nuxt boundary:

- **Frontend** follows a unidirectional 4-layer flow.
- **Server** follows the **repository pattern** behind a thin Nitro API, with a
  provider abstraction for swappable infrastructure (auth, storage).

The mandatory data flow:

```
Component → Page → Store → Composable → Server API → Repository → PostgreSQL
   (UI)   (orchestr.) (state)  (HTTP/DTO)  (Nitro)    (SQL)        (DB)
```

Each layer only talks to its immediate neighbour. A component never calls the
API directly; an endpoint never runs raw SQL.

## Folder structure (annotated)

```
app/                      # Nuxt application (client)
├── components/           # Presentational + feature components, grouped by domain
│   ├── ui/               #   shared design-system primitives
│   ├── expense/ bill/ balance/ house/ report/ bulletin/ user/ gdpr/ subscription/
│   ├── dashboard/ landing/ page/
│   └── __tests__/        #   component unit tests
├── pages/                # Route-level orchestration (auth/ balance/ bills/ …)
├── stores/               # Pinia stores — business logic & state (base.ts is the shared base)
├── composables/          # Layer 4: API clients (useXApi) + domain hooks (useBalance, useAuth)
├── plugins/              # api.client.ts (enhancedFetch), feature-flags, store init
├── middleware/           # Route guards
├── layouts/  assets/  constants/  types/  utils/

server/                   # Nitro server (backend)
├── api/                  # HTTP endpoints, grouped by domain (auth/ bills/ expenses/ …)
│   └── *.get.ts/.post.ts # file-based routes; cron/ holds scheduled jobs
├── repositories/         # Repository pattern — the ONLY place raw SQL lives
│   ├── interfaces/       #   IXRepository contracts (IBaseRepository, IHouseRepository…)
│   ├── postgres/         #   PostgresXRepository implementations + utils.ts
│   └── factory.ts        #   builds the Repositories container from a pg Pool
├── providers/            # Swappable infra behind interfaces
│   ├── auth/             #   IAuthProvider → PostgresAuthProvider (+ factory)
│   └── storage/          #   IStorageProvider (+ factory)
├── utils/                # postgres.ts (pool/executeQuery), jwt/tokens, auth, email, stripe, pdf-report, logger…
├── middleware/           # rate-limit.ts
├── plugins/  emails/  templates/

shared/                   # Code shared by app and server
├── utils/                #   balance.ts, settlement.ts (wrap the engine), money.ts, legal.ts
└── split-engine/         #   vendored, never edited locally (see CLAUDE.md)

database/                 # Numbered SQL migrations — source of truth for schema
supabase/                 # Supabase local dev: migrations/ committed; dumps gitignored
i18n/locales/             # en.json + it.json — all user-facing strings
docs/                     # architecture / api / database / frontend / setup guides
graphify-out/             # Knowledge graph (GRAPH_REPORT.md, graph.json/html)
.claude/agents/           # Project-specific agents (see AGENTS.md)
```

## The layers & dependency flow

### Frontend

1. **Component** (`app/components/`) — UI only. Props in, events out. No fetching,
   no business logic. Renders state passed down or read from a store.
2. **Page** (`app/pages/`) — route orchestration. Wires components together, reads
   from stores, triggers store actions on lifecycle/user intent.
3. **Store** (`app/stores/`) — Pinia. Owns state and business logic. All stores
   build on `base.ts` (`useBaseStore` / `createFeatureStore`) which provides
   `loading`/`error`/`lastFetch` state and a `handleAsyncAction` wrapper. Stores
   call composables — never `fetch` directly.
4. **Composable** (`app/composables/`) — two kinds:
   - **API composables** (`useXApi`) — pure HTTP, no state. They call the API
     client and map responses to DTOs/domain types.
   - **Domain composables** (`useBalance`, `useAuth`, `useCurrency`…) — reusable
     reactive logic.
     The shared HTTP core is `useApi` + `enhancedFetch()` in `app/plugins/api.client.ts`
     (with `handleKnownHttpErrors` + `retryWithBackoff`).

### Server

5. **Endpoint** (`server/api/`) — file-based Nitro route. Responsibilities:
   authenticate, **validate input with Zod**, resolve the request to a repository
   call, shape the response, throw `createError` on failure. No SQL here.
6. **Repository** (`server/repositories/postgres/`) — the only place SQL lives.
   Each implements an `IXRepository` interface and is created by `factory.ts`.
   Queries are **parameterised** and **scoped to the house**.
7. **Provider** (`server/providers/`) — infrastructure behind an interface
   (`IAuthProvider`, `IStorageProvider`) so implementations are swappable.
8. **DB access** — all goes through `server/utils/postgres.ts`
   (`getPostgresPool` / `executeQuery` / `executeTransaction`). Repositories use
   this; nothing else opens connections.

Dependencies point **downward only**. A repository never imports a store; an
endpoint never imports a component.

## Engineering principles (as they apply here)

- **Separation of concerns** — the 4-layer split _is_ this principle. Don't fetch
  in a component, don't put business logic in a composable, don't put SQL in an
  endpoint. Each file has one job.
- **Single responsibility** — one repository per aggregate
  (`PostgresExpenseRepository` only knows expenses); one `useXApi` per domain;
  one store per feature.
- **DRY** — shared store behaviour lives in `base.ts`; shared HTTP in `useApi` /
  `enhancedFetch`; shared SQL helpers in `repositories/postgres/utils.ts`. Reach
  for these before re-implementing loading/error/fetch logic.
- **KISS** — hand-written parameterised SQL over an ORM; file-based routing over a
  router abstraction. Match the existing simplicity; don't add layers.
- **YAGNI** — no speculative abstractions. The provider pattern exists because
  swappability is real (auth/storage); don't add a provider/factory for something
  with a single implementation and no swap on the horizon.
- **Security by construction** — parameterised queries only, Zod on every input,
  house-scoping enforced in the repository, secrets from env. These are not
  optional even for "small" changes.

## Where new code goes

| You're adding…           | Put it in…                                                                  |
| ------------------------ | --------------------------------------------------------------------------- |
| A reusable UI element    | `app/components/ui/`                                                        |
| A feature component      | `app/components/<domain>/`                                                  |
| A new screen/route       | `app/pages/<domain>/`                                                       |
| State + business logic   | `app/stores/<feature>.ts` (extend `createFeatureStore`)                     |
| HTTP call + DTO mapping  | `app/composables/use<Domain>Api.ts`                                         |
| Reusable reactive logic  | `app/composables/use<Thing>.ts`                                             |
| A REST endpoint          | `server/api/<domain>/<name>.<method>.ts`                                    |
| DB access / SQL          | a `server/repositories/postgres/Postgres<X>Repository.ts` (+ its interface) |
| Swappable infrastructure | `server/providers/<concern>/` behind an interface                           |
| A scheduled job          | `server/api/cron/`                                                          |
| A schema change          | a new numbered file in `database/` (and `supabase/migrations/`)             |
| User-facing text         | `i18n/locales/en.json` **and** `it.json`                                    |

## Cross-cutting rules

- **House-scoping** on every data path. <!-- TODO: confirm project_id vs house_id naming -->
- **Zod validation** on every server input.
- **`consola`** for logging — never `console.log`.
- **i18n** — no hardcoded strings, including a11y attributes (`aria-label`, `alt`, `title`).
- **Legal / personal data, consumer law, split engine** — rules live in `CLAUDE.md`.
- **Accessibility** — semantic HTML, labels, focus states, keyboard nav, WCAG AA.
- **Props/Emits** — destructured props with inline defaults (no `withDefaults`);
  emits in Nuxt 4 tuple style `interface Events { event: [payload] }`.
- **Dark mode** — `darkMode: 'class'`; use `dark:` Tailwind variants.

When in doubt about how a piece connects, consult `graphify-out/GRAPH_REPORT.md`
(god nodes, communities) before editing high-fan-out files.
