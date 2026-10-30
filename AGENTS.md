# AGENTS — House M8

When and how to use subagents in this repo. For project context see
[CONTEXT.md](CONTEXT.md); for the architecture they must respect see
[ARCHITECTURE.md](ARCHITECTURE.md).

## Two kinds of agents

|                  | Project agents                                                                              | Generic user-level agents                      |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Location         | `.claude/agents/` (committed)                                                               | `~/.claude/agents/` (per-machine, not in repo) |
| Scope            | Encode **House M8** rules — 4-layer architecture, house-scoping, Zod, i18n, a11y, god nodes | Reusable across any project                    |
| Shared with team | Yes — in version control                                                                    | No                                             |
| Use for          | Anything that must respect this project's conventions                                       | Generic, project-agnostic tasks                |

**Rule of thumb:** if the task needs knowledge of _this_ codebase (its layers,
repositories, conventions, god nodes), use a **project agent**. If it's generic
(e.g. "explain this library", "set up GTM in a Nuxt app"), a user-level or
built-in agent is fine.

## Project agents (`.claude/agents/`)

All are project-scoped (`memory: project`).

| Agent                          | Model  | Purpose / when to use                                                                                                                                                                                                            |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **house-m8-orchestrator**      | opus   | Conductor for a complete feature end-to-end. Sequences prompt-enhancer → task-planner → frontend-engineer → docs-sync-keeper and enforces quality gates. Use when you want the _whole_ pipeline run for a non-trivial feature.   |
| **house-m8-prompt-enhancer**   | opus   | Turns a vague/raw feature request into a precise, architecture-compliant spec (scope, data model, i18n/a11y, security flags). Use as the first step before planning.                                                             |
| **house-m8-task-planner**      | opus   | Produces an ordered implementation plan document in `docs/` for a downstream implementer. Use to plan a feature/refactor before any code is written.                                                                             |
| **house-m8-frontend-engineer** | sonnet | Primary coding agent — implements components, pages, stores, composables following the 4-layer architecture and conventions. Use to execute an approved plan or build a specific frontend piece.                                 |
| **docs-sync-keeper**           | sonnet | Brings docs back in sync after code changes (CONTEXT/ARCHITECTURE/CLAUDE.md/README/DESIGN, memory). Use after a feature, stack change, or restructure.                                                                           |
| **security-auditor**           | sonnet | OWASP Top 10 + infra + compliance audit, producing a structured report (CVSS/CWE, remediation). Use before release or after touching auth/DB-writing code. **Required for DB-writing features** — fix any finding with risk > 5. |
| **gdpr-compliance-auditor**    | sonnet | Audits/fixes GDPR issues — data collection, consent, retention, PII, export & erasure. Use when touching user-data flows or the GDPR export/delete features.                                                                     |

### Typical pipeline

```
house-m8-orchestrator
   └─ house-m8-prompt-enhancer   (clarify & spec)
   └─ house-m8-task-planner      (plan → docs/)
   └─ house-m8-frontend-engineer (implement)
   └─ security-auditor / gdpr-compliance-auditor  (gate, if DB/PII touched)
   └─ docs-sync-keeper           (sync docs)
```

You can also invoke any of these directly for its single step.

## Generic / user-level & built-in agents

Generic agents live outside the repo (`~/.claude/agents/`) or are built into the
harness. Use them for project-agnostic work — they don't know House M8's rules,
so don't rely on them to enforce architecture.

Examples seen in this environment:

- **Built-in:** `Explore` / `general-purpose` (codebase search & multi-step
  research), `code-reviewer`, `a11y-compliance-fixer`, `i18n-translator`,
  `git-branch`, `nitro-api`.
- **User-level (per-machine, may not be present):** generic helpers such as a
  Supabase expert, a Nitro REST expert, or a GTM/analytics agent.
  <!-- TODO: confirm which user-level agents this machine actually has -->

Prefer a project agent whenever the work must obey House M8 conventions; fall
back to a generic one only for truly project-independent tasks.

## Design Context

Any agent producing UI must read [PRODUCT.md](PRODUCT.md) (strategy: who/what/why)
and [DESIGN.md](DESIGN.md) (visual system: colors, type, components) before
designing anything.

Quick reference:

- **Register:** `product` — design serves the product. The landing (`app/pages/index.vue`,
  `pricing.vue`, `app/components/landing/`) is the one `brand` surface; treat it as an override.
- **Platform:** `web` (responsive + PWA). No native target.
- **Positioning:** fairness happens by default, not by someone's effort — the balance is
  always current, always visible, and nobody has to chase anyone.
- **Principles:** name the number/person/date · make the invisible legible · warmth through
  clarity not decoration · calm under money stress · quiet intelligence.
- **Anti-references:** infantile or emoji-heavy; generic SaaS template (gradient hero,
  cream palette, identical icon-card grids, uppercase eyebrows).
- **Accessibility:** WCAG 2.2 AA in **both** themes, `prefers-reduced-motion` alternative for
  every animation, all strings (including `aria-label` / `alt`) via i18n in en + it.

> **Known drift:** `marketing/brand-guidelines.md` (v1.0) still specifies Inter, `#1275e2`,
> an amber accent, and "light-mode only". The code is the truth: Plus Jakarta Sans,
> `#0066CC`, class-based dark mode. Trust `DESIGN.md` and `tailwind.config.ts` over the
> marketing doc until that doc is refreshed.

## Adding a new project agent

Create `.claude/agents/<name>.md` with frontmatter, then commit it so the team
gets it. Template:

```markdown
---
name: 'my-agent'
description: 'Use this agent when … <2-3 concrete <example> blocks with user/assistant/commentary>'
model: sonnet # sonnet for implementation/review; opus for planning/orchestration
color: blue
memory: project # project-scoped — it should know House M8's conventions
---

You are a … for the House M8 project (Nuxt 4 / Vue 3 / Pinia / Tailwind /
PostgreSQL). Always respect the 4-layer architecture, house-scoping, Zod
validation on server inputs, i18n (en + it), accessibility, and the god nodes
listed in graphify-out/GRAPH_REPORT.md.

<role-specific instructions…>
```

Guidance:

- Make `description` action-oriented with example triggers — that's what routing
  uses to pick the agent.
- Use **opus** for high-reasoning planning/orchestration, **sonnet** for
  implementation, review, and audits.
- Keep it project-scoped (`memory: project`) and have it reference the real
  conventions in [ARCHITECTURE.md](ARCHITECTURE.md) and `CLAUDE.md`.
