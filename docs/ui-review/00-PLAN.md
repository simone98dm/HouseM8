# UI Review — Plan

Status: analysis only. No source edits, no commits, no branch changes.
Started: 2026-10-12 · Branch at start: `main` (dirty tree, untouched)

## Goal

Review every page and its components for design quality (color, type,
proportion, spacing, responsiveness), performance, and accessibility (WCAG 2.2
AA, per `PRODUCT.md`). Produce one handoff per page group, then one master fix
plan that is the single source of truth for applying fixes.

## Method

Each group is audited against the same rubric so handoffs are comparable.

| Source                                        | What it provides                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `impeccable` skill — `audit` reference        | 5 scored dimensions (A11y, Performance, Theming, Responsive, Anti-patterns), 0–4 each, P0–P3 severity                                                          |
| `impeccable` product register + shared bans   | Slop test, product bans (inconsistent component vocabulary, modal-first, decorative motion)                                                                    |
| `PRODUCT.md`                                  | Brand constraints: no emoji-heavy UI, no gradient hero, no card grids, no eyebrow-per-section, calm/control                                                    |
| `DESIGN.md`                                   | Declared design system ("Kinetic Gallery") — checked for drift against the code                                                                                |
| Bundled detector (`scripts/detect.mjs`)       | Deterministic anti-pattern hits over `app/`                                                                                                                    |
| Regex metric scan (scratchpad `scan.py`)      | Per-file counts: hex colors, arbitrary values, `dark:` coverage, touch-target candidates, clickable non-buttons, missing `type`, headings, motion, breakpoints |
| WCAG contrast calculation                     | Real ratios for every token/utility pair in use, both themes                                                                                                   |
| Template dependency map (scratchpad `map.py`) | Which components each page actually renders; unreferenced components                                                                                           |

Limits of this pass, stated up front:

- **Static analysis only.** No dev server was running, and authenticated pages
  need a seeded DB plus a session. Nothing here was measured in a browser:
  no Lighthouse, no axe, no real viewport screenshots. Contrast is computed
  from token values, not sampled from pixels. Step V1 of the master plan
  closes this gap.
- Findings in a shared component are recorded once, in the group that owns the
  component, and referenced by ID elsewhere.

## Severity

- **P0** blocks a task or a whole user group (keyboard/screen-reader dead end).
- **P1** WCAG AA violation or a significant usability/brand failure.
- **P2** inconsistency or annoyance with a workaround.
- **P3** polish.

## Groups and order

Foundation first: token and primitive findings change how every later page is
read, and fixing them fixes most pages at once.

| #   | Group             | Pages                                                                                            | Components                                                                                            | Handoff                          |
| --- | ----------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| 00  | Foundation        | layouts `default`, `legal`; `app.vue`                                                            | tokens/SCSS, `tailwind.config.ts`, `App*` (6), `page/` (2), `legal/` (1), `ui/` (29)                  | `handoffs/00-foundation.md`      |
| 01  | Marketing         | `/`, `/pricing`                                                                                  | `landing/` (5)                                                                                        | `handoffs/01-marketing.md`       |
| 02  | Auth & join       | `/auth/login`, `register`, `forgot-password`, `password-reset`, `confirm`, `/house/join/[token]` | `auth/` (8), `house/JoinInvitationCard`, `gdpr/ConsentCheckbox`                                       | `handoffs/02-auth.md`            |
| 03  | Dashboard         | `/dashboard`                                                                                     | `dashboard/` (4), `bulletin/` (2), `house/BillsPreview`, `house/MembersCard`, `house/RoleChangeModal` | `handoffs/03-dashboard.md`       |
| 04  | Expenses          | `/expenses`                                                                                      | `expense/` (8), `subscription/` (2)                                                                   | `handoffs/04-expenses.md`        |
| 05  | Bills             | `/bills`, `/bills/[id]`                                                                          | `bill/` (14)                                                                                          | `handoffs/05-bills.md`           |
| 06  | Balance & reports | `/balance`, `/reports`                                                                           | `balance/` (7), `report/` (4)                                                                         | `handoffs/06-balance-reports.md` |
| 07  | House & user      | `/house/[id]`, `/user/[id]`                                                                      | `house/` (rest), `user/` (10)                                                                         | `handoffs/07-house-user.md`      |
| 08  | Settings & legal  | `/settings/privacy`, `/settings/subscription`, `/privacy`, `/terms`, `/cookies`                  | `gdpr/` (rest)                                                                                        | `handoffs/08-settings-legal.md`  |

## Per-group steps

1. Read every page and component template/style in the group (script blocks
   read where they carry keyboard, focus, or rendering logic).
2. Pull the group's rows from the detector output and the metric scan.
3. Check the rubric: heading order, landmarks, labels, names for icon-only
   controls, focus visibility, keyboard paths, live regions, target size,
   contrast per token pair, dark-mode parity, breakpoints and overflow,
   motion and reduced-motion, image/asset loading, render cost, token drift,
   anti-patterns and brand-rule breaks.
4. Write the handoff using the template below.

## Handoff template

```
# NN — <Group>
Scope: pages + components (paths)
Scores: A11y x/4 · Perf x/4 · Theming x/4 · Responsive x/4 · Anti-patterns x/4 = xx/20
Summary: 3–5 lines
Findings: table — ID | Sev | Category | Location (file:line) | Issue | Fix
Systemic refs: IDs owned by another group that also show here
Working well: what to keep
```

Finding IDs: `F00-01` (foundation), `F03-07` (dashboard), and so on. IDs are
stable; the master plan refers to them.

## Final step

Read all handoffs → `FIX-PLAN.md`: deduplicated, ordered global-first
(tokens → primitives → shell → pages), each task with exact files, the change,
the finding IDs it closes, and a verification command.

## Progress

- [x] Context: PRODUCT.md, DESIGN.md, tokens, Tailwind config
- [x] Detector + metric scan + dependency map
- [x] 00 Foundation
- [x] 01 Marketing
- [x] 02 Auth & join
- [x] 03 Dashboard
- [x] 04 Expenses
- [x] 05 Bills
- [x] 06 Balance & reports
- [x] 07 House & user
- [x] 08 Settings & legal
- [x] FIX-PLAN.md
