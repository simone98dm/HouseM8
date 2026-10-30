# Contributing to House M8

Thanks for contributing! This guide covers setup, conventions, and the PR process.
For project context see [CONTEXT.md](CONTEXT.md); for design rules see
[ARCHITECTURE.md](ARCHITECTURE.md). Full setup detail lives in
[docs/setup.md](docs/setup.md).

## Local setup

**Prerequisites:** Node (see `.nvmrc`), **yarn** (the package manager — do not use
npm), Docker (for local PostgreSQL), Git.

```bash
git clone https://github.com/simone98dm/house-m8-fe.git
cd house-m8-fe
yarn                       # install (runs nuxt prepare + husky)
docker compose up -d       # start PostgreSQL
cp .env.example .env       # set at least POSTGRES_URL and JWT_SECRET
yarn dev                   # → http://localhost:3000
```

Schema lives in `database/` as numbered SQL files; see [docs/database.md](docs/database.md).

## Everyday commands

```bash
yarn dev               # dev server
yarn build             # production build
yarn typecheck         # nuxi typecheck

yarn lint              # eslint (check)
yarn lint:fix          # eslint (fix)
yarn format            # prettier (check)
yarn format:fix        # prettier (write)

yarn test              # unit + integration + api
yarn test:unit         # components / composables / stores
yarn test:integration  # pages
yarn test:api          # server/__tests__
yarn test:e2e          # cypress
```

## Branch naming

Never commit to `main`. Branch from up-to-date `main` using
`<type>/<short-kebab-description>`:

| Prefix                | Use for                                       |
| --------------------- | --------------------------------------------- |
| `feature/`            | new functionality (`feature/expense-filters`) |
| `fix/`                | bug fixes (`fix/balance-rounding`)            |
| `hotfix/`             | urgent production fixes                       |
| `docs/`               | documentation only (`docs/update-license`)    |
| `chore/`              | tooling, deps, config                         |
| `refactor/` / `test/` | refactors / test-only changes                 |

The prefix should match the primary commit type.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
**husky + commitlint** on every commit.

```
<type>(<scope>): <subject>

<body>            # optional — what & why, not how

<footer>          # optional — "Fixes #123", "BREAKING CHANGE: …"
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`,
`ci`, `build`.

**Common scopes:** `expenses`, `bills`, `houses`, `balance`, `auth`, `reports`,
`ui`, `api`, `db`.

**Subject:** imperative mood, lowercase, no trailing period, ≤ ~72 chars.

```bash
feat(expenses): add date range filter
fix(api): correct balance calculation for multi-currency
docs: update setup guide
feat(auth)!: rotate refresh tokens on use   # ! marks a breaking change
```

`lint-staged` runs eslint + prettier on staged files automatically via the
pre-commit hook.

## Naming conventions

Names must reveal intent. Prefer `outstandingBalance` over `bal`,
`isMemberOfHouse` over `check`.

| Thing                 | Convention                      | Example                              |
| --------------------- | ------------------------------- | ------------------------------------ |
| Components            | PascalCase, multi-word          | `ExpenseCard.vue`, `UserAvatar.vue`  |
| Composables           | `useX` camelCase                | `useExpensesApi`, `useBalance`       |
| Stores                | `useXStore` / file `x.ts`       | `app/stores/expenses.ts`             |
| Repositories          | `Postgres<Aggregate>Repository` | `PostgresBillRepository.ts`          |
| Interfaces / Types    | PascalCase                      | `IBillRepository`, `HouseBalance`    |
| Endpoints             | `<name>.<method>.ts`            | `server/api/bills/[id].get.ts`       |
| Variables / functions | camelCase                       | `totalOwed`, `calculateSettlement()` |
| Constants             | UPPER_SNAKE_CASE                | `MAX_HOUSE_MEMBERS`                  |
| i18n keys             | dotted lowercase                | `expenses.filter.byStatus`           |

## Code style

- **Prettier** + **ESLint** (`@nuxt/eslint`) are the source of truth — run
  `yarn lint:fix` and `yarn format:fix` before pushing.
- **TypeScript**: explicit types at boundaries, no implicit `any`.
- **Props**: destructure with inline defaults — **no `withDefaults`**.
- **Emits**: tuple style — `interface Events { close: []; save: [payload: X] }`.
- **Server**: no raw SQL outside repositories; Zod-validate every input;
  `consola` for logging (never `console.log`); scope every query to its house.
- **Styling**: Tailwind utilities first; `dark:` variants for dark mode; no
  hardcoded strings — use `t('key')` in both `en.json` and `it.json`.
- **Accessibility**: semantic elements, labels, focus states, keyboard nav, WCAG AA.

## Feature checklist (before "done")

Every feature, no exceptions:

1. **Lint & format** — `yarn lint:fix` and `yarn format:fix`, zero errors.
2. **i18n** — no static user-facing text; keys in `en.json` _and_ `it.json`,
   including a11y attributes.
3. **Accessibility** — fully a11y compliant (consider the `a11y-compliance-fixer`
   agent for a final pass).
4. **Security** (DB-writing features) — parameterised queries, Zod validation,
   house-scoping enforced, no user-controlled SQL. Run the `security-auditor`
   agent; fix any finding with risk > 5.
5. **Tests** — new/changed component → test in `__tests__/`; new composable →
   full coverage; `yarn test:unit` passes.
6. **Legal** — if the change touches processors, personal data, purposes or retention, follow the legal-change rule in `CLAUDE.md` and `docs/legal/release-legal-checklist.md`.
7. **Branch discipline** — correct prefix, never on `main`.

## Pull request process

Before opening a PR, confirm: tests pass, `yarn lint` + `yarn typecheck` clean,
docs updated if behaviour/architecture/stack changed, branch rebased on `main`.

In the PR describe **what** changed and **why**, how it was tested, and link
related issues (`Fixes #123`). At least one maintainer review is required; CI
must be green. PRs are squash-merged.

## Documentation

Update docs alongside code: new feature → [CONTEXT.md](CONTEXT.md);
flow/layer change → [ARCHITECTURE.md](ARCHITECTURE.md); API change →
[docs/api.md](docs/api.md) and `openapi.yaml`; design tokens → [DESIGN.md](DESIGN.md).
The `docs-sync-keeper` agent can do this pass for you (see [AGENTS.md](AGENTS.md)).

## License

By contributing you agree your contributions are licensed under the project's
MIT license (see [LICENSE](LICENSE)).
