# UI Fix Plan — single source of truth

Built from `handoffs/00`–`08` (165 findings: 0 P0 · 50 P1 · 85 P2 · 30 P3).
Analysis was static; nothing was measured in a browser. Phase 0 closes that.

> Note (Lived-in Ledger redesign): tokens now live in `app/assets/css/tokens.css` (not `_tokens.scss`), initials avatars were replaced by Blobatar, and `billIcon()`/Heroicons category icons by Phosphor duotone category icons. Read file and icon references below with that in mind.

| Group                | Score /20 | P1  | P2  | P3  |
| -------------------- | --------- | --- | --- | --- |
| 00 Foundation        | 9         | 17  | 22  | 7   |
| 01 Marketing         | 11        | 5   | 8   | 4   |
| 02 Auth & join       | 13        | 3   | 8   | 2   |
| 03 Dashboard         | 10        | 4   | 7   | 3   |
| 04 Expenses          | 11        | 4   | 7   | 3   |
| 05 Bills             | 12        | 3   | 10  | 3   |
| 06 Balance & reports | 10        | 6   | 8   | 3   |
| 07 House & user      | 13        | 2   | 9   | 3   |
| 08 Settings & legal  | 11        | 6   | 6   | 2   |

## Status (updated 2026-10-12)

Decisions: D1 PRODUCT.md wins · D2 rebuild landing · D3 replace tiles and
banners · D4 keep typeface · D5 prices deferred (T5.1 on hold).

**The project now runs Tailwind CSS 4.** `tailwind.config.ts` and all SCSS
partials are gone. Theme lives in `app/assets/css/main.css` (`@theme`),
tokens in `tokens.css`. Where a task below says "`tailwind.config.ts`", read
"`@theme` in `main.css`"; where it says `_x.scss`, read `x.css`.

| Task                        | State   | Notes                                                                                                                                                                                                                     |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1.1 token values           | done    |                                                                                                                                                                                                                           |
| T1.2 semantic colours       | done    | `bg-surface text-fg border-line bg-brand text-ok-fg …` exist; 112 arbitrary `[var(--x)]` classes already converted. Legacy palette scales stay until T4.2.                                                                |
| T1.3 type scale             | partial | Project tokens renamed `--text-*` → `--fs-*` to stop colliding with Tailwind 4's theme. Still 12 steps; mapping onto the Tailwind scale remains.                                                                          |
| T1.4 z-index                | open    |                                                                                                                                                                                                                           |
| T1.5 radius/shadow          | partial | `rounded-control`, `rounded-card`, `--shadow-sm/md/lg` in theme. Template sweep remains.                                                                                                                                  |
| T1.6 motion                 | done    | Global reduced-motion rule; bounce/pulse-slow definitions removed (their class names in `AllSettledState.vue` and `balance/index.vue` are now inert; remove in T5.6); `expandWidth` uses `scaleX`.                        |
| T1.7 fonts                  | open    |                                                                                                                                                                                                                           |
| T1.8 breakpoints/dvh        | open    |                                                                                                                                                                                                                           |
| T3.5 marketing shell        | done    |                                                                                                                                                                                                                           |
| T5.8 `/cookies` public path | done    | rest of T5.8 open                                                                                                                                                                                                         |
| T6.1 landing                | done    | Pricing section left as is (D5).                                                                                                                                                                                          |
| T6.2 summary blocks         | done    | `UiSummary`; `DashboardStatCard` and `stat.css` deleted. Dashboard still shows the outstanding total, not a per-person sentence: the page has no settlement data. Needs `useDashboardPage` to expose the next settlement. |
| T6.3 DESIGN.md              | done    |                                                                                                                                                                                                                           |

Tailwind 4 class renames already applied app-wide: `flex-shrink-*` →
`shrink-*`, `flex-grow` → `grow`, `bg-gradient-to-*` → `bg-linear-to-*`,
`outline-none` → `outline-hidden`, `backdrop-blur-sm` → `backdrop-blur-xs`,
bare `ring` → `ring-3`. New code: `text-[color:var(--x)]` when a CSS var is
used as a text colour without a named utility.

Known failures that predate this work (from the dependency upgrade in the
working tree, not from UI changes): `nuxt typecheck` errors in `server/`
(zod 4 and stripe 23 API changes); 84 ESLint errors from ESLint 10's
`no-useless-assignment` and unused-vars rules; 11 tests in
`app/pages/settings/__tests__/subscription.test.ts` (`TypeError: Invalid URL`).

Next up: T2.1–T2.3 (button, field, modal), T3.1–T3.4 (skip link, bottom nav,
sidebar, page header), then T4.1.

---

## How to execute this plan

- Order is strict by phase: tokens → primitives → shell → sweeps → pages →
  redesigns. Later phases assume earlier ones; most page findings close as a
  side effect of phases 1–4.
- One branch per phase (`fix/ui-tokens`, `fix/ui-primitives`, …). Never on `main`.
- Project rule: code changes go through the `house-m8-orchestrator` agent.
  Hand it one phase at a time with the task IDs below.
- After every task: `yarn lint:fix && yarn format:fix && yarn typecheck &&
yarn test:unit`. New/changed i18n keys go in **both** `en.json` and `it.json`.
- Update the component's `__tests__` file when its markup or classes change;
  many tests assert class names (e.g. `Notification.test.ts` still expects
  `border-l-4`).
- Each task lists the finding IDs it closes. Tick the task, not the finding.

## Decisions needed before Phase 6 (phases 0–5 do not depend on them)

| #   | Decision                                                                                                                  | Recommendation                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| D1  | `DESIGN.md` ("Kinetic Gallery": gradients, glass, bounce, no dividers) contradicts `PRODUCT.md` and the code. Which wins? | PRODUCT.md. Regenerate DESIGN.md from the Phase 1 tokens (`impeccable document`). |
| D2  | Landing page: patch tells only, or rebuild?                                                                               | Rebuild hero + features (T6.1). Patching leaves the template skeleton.            |
| D3  | Dashboard/Balance/Bills headline blocks: keep stat tiles and blue banners, or replace with one balance sentence?          | Replace (T6.2). It is the product's stated job.                                   |
| D4  | Typeface: Plus Jakarta Sans is flagged as overused.                                                                       | Keep for now; it is a brand call, not a defect. Only fix its delivery (T1.7).     |
| D5  | Plans and prices: three hardcoded copies that disagree. Which is true?                                                    | Needs the owner's answer; T5.1 builds the single config either way.               |

---

## Phase 0 — Baseline and verification

- [ ] **T0.1** Start `yarn dev` with a seeded DB and a logged-in session.
      Capture Lighthouse + axe for `/`, `/auth/login`, `/dashboard`, `/expenses`,
      `/bills`, `/balance` at 360px and 1280px, light and dark. Save under
      `docs/ui-review/baseline/`.
- [ ] **T0.2** Confirm or drop each _(verify)_ item. Each is a one-look check:

  | Finding | Check                                                                               |
  | ------- | ----------------------------------------------------------------------------------- |
  | F00-08  | Open any modal on mobile: is the bottom nav above the backdrop and tappable?        |
  | F00-11  | On a phone, is there any path to `/reports` and `/house/:id`?                       |
  | F00-33  | `/bills/:id`: does the back button stack above the title?                           |
  | F00-34  | 320px: does the notification panel overflow left?                                   |
  | F01-08  | `/pricing` logged out: is the app sidebar shell rendered?                           |
  | F01-11  | `/`: does the header stay sticky on scroll?                                         |
  | F01-12  | `/` at 320px in Italian: does the `h1` overflow?                                    |
  | F04-09  | `/expenses` mobile: does the FAB cover the last row?                                |
  | F05-02  | `/bills/:id` mobile: trigger an error; is the toast hidden by the nav?              |
  | F05-04  | `/bills/:id` at 360px as creator: does the action row overflow?                     |
  | F08-02  | Logged out, open `/cookies`: redirected to login? (code says yes: exact-match list) |
  | F08-07  | `/settings/privacy`: is the header bar blank?                                       |

---

## Phase 1 — Tokens (global; closes the most findings per line changed)

### T1.1 Fix failing token values — `app/assets/css/_tokens.scss`

Light `:root`:

```scss
--fg-subtle: #627084; /* was #94a3b8 (2.56) → 5.04 on surface, 4.60 on bg */
--primary: var(--blue-600); /* was blue-500 (3.68) → 5.17 text and fill */
--primary-hover: #1d4ed8; /* 6.16 on primary-subtle */
--secondary: var(--purple-600); /* white text 5.70 */
--secondary-hover: #6d28d9;
--success: var(--green-700); /* fills with white text 5.48 */
--danger: var(--red-700); /* 6.47 */
--warning: #b45309; /* 5.02 */
--border-control: #7b8799; /* new: field boundary, 3.64 on white, 3.32 on bg */
```

Dark `.dark`:

```scss
--border-control: #6b7494; /* 3.87 on surface, 3.55 on surface-raised */
--success: var(--green-400); /* dark fills take --primary-fg-style dark ink */
--danger: var(--red-400);
--warning: var(--yellow-400);
--on-status: #0c0e1a; /* ink on dark-mode status fills (≥6.9) */
```

Add light `--on-status: #fff`. Add `--surface-high: var(--surface-hover)`
(referenced by `OtpCodeInput`, currently undefined).

Check `state-card`: it mixes `--{state}` at 18–25% for borders/chips, so the
darker light values only strengthen them. `.stat-icon`, `.confirm-icon-wrap`
use the same vars; glance at them after the change.

Closes: F00-03, F00-04, F00-41, F02-03, most of F00-12, part of F07-01.

### T1.2 One colour system — `tailwind.config.ts`

Add semantic colours that read the CSS vars, so no `dark:` is needed:

```ts
colors: {
  bg: 'var(--bg)',
  surface: { DEFAULT: 'var(--surface)', raised: 'var(--surface-raised)', hover: 'var(--surface-hover)' },
  fg: { DEFAULT: 'var(--fg)', muted: 'var(--fg-muted)', subtle: 'var(--fg-subtle)' },
  line: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)', control: 'var(--border-control)' },
  brand: { DEFAULT: 'var(--primary)', hover: 'var(--primary-hover)', subtle: 'var(--primary-subtle)', on: 'var(--primary-fg)' },
  ok:     { DEFAULT: 'var(--success)', fg: 'var(--success-fg)', subtle: 'var(--success-subtle)' },
  warn:   { DEFAULT: 'var(--warning)', fg: 'var(--warning-fg)', subtle: 'var(--warning-subtle)' },
  danger: { DEFAULT: 'var(--danger)',  fg: 'var(--danger-fg)',  subtle: 'var(--danger-subtle)' },
}
```

Note: the existing `surface` key (blue-white tiers, `bg-surface-high` etc.)
is used in `useButtonStyles.ts`, `Input.vue`, `Select.vue` only. Replace those
uses in T2.1/T2.2 before repurposing the key. Opacity modifiers
(`bg-brand/10`) will not work with plain `var()`; use `color-mix` utilities
or keep `--*-subtle` tokens for tints.

Leave the `gray`, `primary`, `error`… scales in place until the T4.2 sweep is
done, then delete `secondary` (slate), `tertiary`, `accent`, `info`, `purple`
and the unused surface tiers.

Closes (with T4.2): F00-01, F00-05, F01-13, F03-11, F06-17.

### T1.3 One type scale

- Delete `--text-2xs` … `--text-6xl` from `_tokens.scss`. Replace their 60-odd
  uses (SCSS partials + scoped styles; `grep -rn "var(--text-" app`) with
  Tailwind `theme('fontSize.*')` or `@apply text-*`.
- Mapping: `2xs,xs → text-xs (12px)`, `sm,base → text-sm (14px)`,
  `md,lg → text-sm/text-base`, `xl,2xl → text-base/lg`, `3xl → text-lg`,
  `4xl → text-xl`, `5xl → text-2xl`, `6xl → text-3xl`.
- Remove `.fs-2xs` (`_utilities.scss`); its two uses in `report/Card.vue`
  become `text-xs`.
- `tailwind.config.ts`: drop `display-sm/md/lg` (unused) and the negative
  letter-spacing on `xs/sm` positive values stays.
- Keep `html { font-size: clamp(1rem, …, 1.125rem) }`.

Closes: F00-02, part of F00-12 (10px labels), F06-06 (size half).

### T1.4 z-index scale

`_tokens.scss`: `--z-sticky:10; --z-nav:20; --z-dropdown:30; --z-backdrop:40;
--z-modal:50; --z-toast:60; --z-tooltip:70;`
`tailwind.config.ts` `zIndex: { sticky:'10', nav:'20', dropdown:'30', modal:'50', toast:'60', tooltip:'70' }`.

Apply: `.sidebar`, `.bottom-nav` → `var(--z-nav)`; `.page-header` →
`var(--z-sticky)`; `.sidebar-item::after` → `var(--z-tooltip)`; `UiModal`,
`Carousel` fullscreen, `ConsentVersionModal` → `z-modal`;
`NotificationDropdown` panel, `MembersCard` role menu → `z-dropdown`;
`NotificationContainer`, `AppLoader` (`z-[9999]`) → `z-toast`; expenses FAB
`z-30` → `z-sticky`.

Closes: F00-08, F05-02 (stacking half).

### T1.5 Radius and shadow roles

- `tailwind.config.ts` `borderRadius`: `control: 'var(--radius)'` (10px),
  `card: 'var(--radius-lg)'` (14px); remove `4xl`, `5xl`.
- `boxShadow`: replace the custom scale with `sm/md/lg: 'var(--shadow-*)'`;
  delete `xs`, `xl`, `2xl`, `glow`, `glow-lg`, `inner`.
- Sweep in T4: `rounded-xl|2xl|[1.75rem]|[2rem]|3xl` on surfaces →
  `rounded-card`; on fields/buttons → `rounded-control`; `rounded-full` stays
  only on avatars, chips, badges, switches, dots.

Closes: F00-23, F00-24.

### T1.6 Motion

- `_animations.scss`: replace the per-class reduced-motion block with

  ```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

- `tailwind.config.ts`: delete `bounce-subtle`, `bounce-in-scale`,
  `pulse-select`, `pulse-slow` animations/keyframes and the `bounce-in` /
  `bounce-out` timing functions. Keep one `animate-fade-in` (remove the SCSS
  duplicate class, keep the keyframes for `UiEmptyState` until T2.9).
- `expand-width`: animate `transform: scaleX()` with `transform-origin: left`.

Closes: F00-09, F00-25, F00-42, F06-11 (animation half), F06-15.

### T1.7 Fonts

- Convert Regular/Medium/SemiBold/Bold/ExtraBold to WOFF2 (or ship the
  variable WOFF2). Delete the 7 italic files and ExtraLight/Light.
- `_fonts.scss`: 5 `@font-face` blocks, `format('woff2')`, keep
  `font-display: swap` and the fallback face.
- `nuxt.config.ts` `app.head.link`: `rel="preload" as="font" type="font/woff2"
crossorigin` for 400 and 600.
- `tailwind.config.ts` `fontWeight`: remove `thin/extralight/light`.

Closes: F00-14.

### T1.8 Breakpoints and viewport units

- All SCSS `@media (max-width: 768px)` → `767.98px`; `960px` → `1023.98px`;
  keep `480px`. Files: `layout/_app.scss`, `components/_stat.scss`,
  `features/_dashboard.scss`, `AppNavigationSidebar.vue`,
  `AppNavigationBottomNav.vue`.
- `100vh` → `100dvh` in `.app-layout`, `.main-content`, `.sidebar`,
  `.auth-bg`; `max-h-[90vh]` → `max-h-[90dvh]` in `ui/Modal.vue`.
- `_base.scss`: delete the custom `::-webkit-scrollbar*` rules.
- `nuxt.config.ts`: two `theme-color` metas with `media` for light/dark
  (`#ffffff` / `#0c0e1a`).

Closes: F00-32, F00-43, F00-45, part of F00-27, part of F02-10.

---

## Phase 2 — Primitives (`app/components/ui`, `useButtonStyles.ts`)

### T2.1 Button — `composables/useButtonStyles.ts`, `ui/Button.vue`, `ui/LinkButton.vue`

- Base: `inline-flex items-center justify-center rounded-control font-semibold
transition-colors duration-150 focus-visible:outline focus-visible:outline-2
focus-visible:outline-offset-2 focus-visible:outline-brand`. Remove
  `rounded-full`, `transition-all`, `active:scale-95`, `focus:ring-*`,
  `shadow-*`, `hover:opacity-90`.
- Variants: primary `bg-brand text-brand-on hover:bg-brand-hover`; secondary
  `bg-surface-hover text-fg border border-line-strong hover:bg-surface-raised`;
  ghost `text-brand hover:bg-brand-subtle`; danger
  `bg-danger text-[var(--on-status)] hover:brightness-95`. Outline variants:
  `border-line-control`.
- Sizes: `sm: min-h-9 px-3 text-sm`, `md: min-h-11 sm:min-h-10 px-4 text-sm`,
  `lg: min-h-12 px-6 text-base`. Icon-only (no default slot): square
  `size-9 / size-11 sm:size-10 / size-12`, no horizontal padding.
- `Button.vue`: `:aria-busy="loading || undefined"`; keep the slot rendered in
  `success` state (wrap in `sr-only` if the check replaces it).

Closes: F00-19, F00-20, F00-21, F00-06 (button part), F04-14 groundwork.

### T2.2 Input / Select — `ui/Input.vue`, `ui/Select.vue`, `ui/LanguageSwitcher.vue`

- Border `border-line-control`; background `bg-surface`; text `text-fg`;
  placeholder `placeholder:text-fg-muted`; focus
  `focus-visible:outline-2 outline-brand` (drop the 15% ring); disabled
  `bg-surface-hover text-fg-muted`. Remove every `dark:` and `bg-surface-low`.
- Font size `text-base sm:text-sm` for all sizes.
- Hint `<p>`: add `role="alert"` when `error`.
- `Input.vue`: `type="password"` gets a reveal toggle button (icon-only,
  `aria-pressed`, i18n label) in the trailing slot; new prop `suffix` for the
  currency adornment.
- `Select.vue`: add `hint` + `error` text with the same wiring as Input.
- `LanguageSwitcher.vue`: use `UiSelect`; `useId()` instead of
  `language-select`.

Closes: F00-06, F00-07, F00-29, F02-04 (toggle half), F04-03 (search half via T5.4).

### T2.3 Modal — `ui/Modal.vue`, `ui/ConfirmModal.vue`

- Move `role="dialog" aria-modal aria-labelledby` from the backdrop to
  `.modal-content`. Backdrop keeps `@click.self`.
- Lock body scroll while `show` (`document.documentElement.style.overflow`),
  restore on close/unmount.
- New prop `persistent` (no Escape, no backdrop close, no X).
- New optional `as="form"` + `@submit` emit so content modals can be forms;
  footer slot stays inside the form.
- Panel `bg-surface-raised text-fg rounded-card`; header/footer borders
  `border-line`; close button `p-2`, `text-fg-muted`.
- Transition: opacity + `translateY(8px)`, 180ms; drop the `scale(0.9)`.
- `ConfirmModal.vue`: remove both `aria-label`s; `role="alertdialog"` when
  `confirmVariant === 'danger'`.

Closes: F00-27, F00-13 (confirm part), F08-03 groundwork.

### T2.4 Card — `ui/Card.vue`

Remove hover shadow/translate from `default` and `elevated`. Add
`interactive?: boolean` → `hover:shadow-md transition-shadow cursor-pointer`.
`outlined` border `border-line`. Radius `rounded-card`. Drop `transition-all`.

Closes: F00-22, F06-13 (hover part).

### T2.5 Chip — `ui/Chip.vue`

`<component :is="selectable ? 'button' : 'span'" :type="selectable ? 'button' : undefined">`;
remove `tabindex` and the key handlers. Remove button: `size-6 -mr-1` hit
area, `:aria-label="t('common.removeItem', { label })"`. Drop
`hover:shadow-md active:scale-95 transition-all`. Selected styles use
`bg-brand text-brand-on`.

Closes: F00-16; unblocks F05-07 period picker.

### T2.6 Avatar — `ui/UserAvatar.vue` + remove duplicates

- Background: one of the five AA-safe `.avatar-a…e` fills chosen by name
  hash (move the hash from `dashboard/ActivityFeed.vue` into the component).
  No gradient. `role="img"` when `ariaLabel` is set, else `aria-hidden`.
- Replace `.sidebar-avatar`, `balance/PersonCard.vue:71`,
  `balance/SettlementRow.vue:39,67`, and `.avatar*` uses in `ActivityFeed`
  with `<UiUserAvatar>`.

Closes: F00-30, F06-13 (avatar part).

### T2.7 Carousel — `ui/Carousel.vue`

- Slide image inside `<button type="button" :aria-label="t('a11y.carousel.openFullscreen')">`.
- `alt`: `t('a11y.carousel.imageAlt', { n, total })`.
- Dots/thumbs: `:aria-label`, `:aria-current="index === currentIndex"`, hit
  area `size-6` with an inner 8px dot.
- Fullscreen: render through `UiModal` (gets trap, Escape, focus return).
- Render only `currentIndex` and neighbours; `loading="lazy"` on the rest.
- Remove `backdrop-blur-sm`, `transition-all`, `hover:scale-110`; add
  `aria-hidden` to the chevron at L157.

Closes: F00-15.

### T2.8 Notifications — `ui/Notification.vue`, `ui/NotificationContainer.vue`, `ui/NotificationDropdown.vue`, `stores/notifications.ts`

- `role="status"` for success/info, `role="alert"` for error/warning; drop
  explicit `aria-live`.
- Store: no auto-dismiss when `action` is set; otherwise 5s stays.
- Container: one list, positioned with responsive classes, instead of
  rendering every toast twice.
- Dropdown: panel `w-[min(20rem,calc(100vw-2rem))]`; remove `aria-haspopup`,
  add `aria-controls`; `bell-slash` icon `text-fg-muted`.

Closes: F00-28, F00-34.

### T2.9 Remaining primitives

- `ui/EmptyState.vue`: remove the three inline `style="animation…"`; add
  `headingLevel` prop (default 2); colours via tokens. Then delete
  `.empty-state` SCSS and the `fadeIn` keyframes copy.
- `ui/Skeleton.vue` consumers: wrap groups in
  `<div role="status"><span class="sr-only">{{ t('common.loading') }}</span>…`.
  Add a tiny `UiLoadingRegion` only if three or more call sites end up
  repeating it (they will: dashboard, expenses, bills, balance, reports,
  house, user).
- `ui/Switch.vue`: knob transition `duration-150 ease-out`; remove overshoot.
- `ui/Checkbox.vue`: make it a real checkbox (native input + label) or delete
  and use `UiSwitch` in `bill/EditModal.vue:203`.
- `ui/Wizard.vue`: visible `t('wizard.stepOf', { n, total })`,
  `aria-current="step"` on the active dot.
- `ui/UploadDocumentDropzone.vue`: delete striped-border layers and the
  scoped CSS; root `border-2 border-dashed border-line-control rounded-card`;
  `<h3>` → `<p>`.
- `ui/UploadDocumentFileList.vue`: remove button `type="button"`,
  label `t('common.removeItem', { label: file.name })`; `<h5>` → `<p>`.
- `ui/PictureUpload.vue`: `alt` through `t()`; remove button `size-6`.
- `ui/Container.vue`: keep as the page wrapper but remove `animate-fade-in`.
- `AppLoader.vue`: delete the scoped `<style>`; drop `backdrop-blur-sm`.
  Audit `useLoading()` callers and stop using it for requests that already
  show a skeleton.
- `package.json`: remove `@heroicons/vue`.

Closes: F00-35, F00-36, F00-37, F00-38, F00-42, F00-44, F03-10, F05-08
(checkbox), F07-13 (role part).

---

## Phase 3 — App shell

### T3.1 Skip link and landmarks — `layouts/default.vue`, `layouts/legal.vue`, `auth/AuthShell.vue`

First child: `<a href="#main" class="sr-only focus:not-sr-only focus:fixed
focus:left-2 focus:top-2 focus:z-tooltip …">{{ t('a11y.skipToContent') }}</a>`.
`<main id="main" tabindex="-1">`. Remove `role="main"` in `AuthShell`.

Closes: F00-10, F02-13 (role part).

### T3.2 Bottom nav — `AppNavigationBottomNav.vue`, `useAppNavItems.ts`, `layout/_app.scss`

- Items: Home, Expenses, Bills, Balance, **More**. "More" opens a sheet
  (`UiModal`) listing Reports, House, Profile, theme toggle.
- Labels `text-xs`; inactive `color: var(--fg-muted)`; active
  `var(--primary)`.
- `.bottom-nav { padding-bottom: env(safe-area-inset-bottom); height:
calc(var(--bottom-nav-h) + env(safe-area-inset-bottom)); }` and the same
  expression for `.app-layout` mobile `padding-bottom`.
- `nuxt.config.ts` viewport: append `viewport-fit=cover`.
- Move `LegalLinks` + `AppFooter` out of the mobile shell (into the More
  sheet / profile); keep on desktop.

Closes: F00-11, F00-12, F00-46, F07-11 (reports entry).

### T3.3 Sidebar — `AppNavigationSidebar.vue`

`.sidebar-item:focus-visible::after { opacity: 1 }`; theme toggle
`type="button"` and label naming the target theme; logo: solid
`var(--primary)` square, no gradient; avatar → `UiUserAvatar` (T2.6).

Closes: F00-31, F00-40 (app half).

### T3.4 Page header — `AppHeader.vue`, `layout/_app.scss`, all pages

- `.page-header-left`: `flex-direction: row; align-items: center; gap: 8px`.
  Remove the inline `style`.
- **One title pattern for every app page:** `AppPageHeader` slot contains
  `<h1>` (styled by `.page-header h1`) and optional `.page-header-meta`.
  Remove `UiPageTitle` from app pages; its `action` slot content moves to
  `AppPageHeader #actions`. Sections in the body start at `h2`, cards at `h3`.
- Pages to change: `expenses/index`, `balance/index`, `reports/index`,
  `house/[id]` (`<p>` → `<h1>`, drop body title), `bills/index`, `bills/[id]`,
  `user/[id]` (drop utility classes on the `h1`), `settings/privacy`,
  `settings/subscription` (add `AppPageHeader`).

Closes: F00-33, F04-06 (title half), F05-05, F05-15, F06-08, F07-05, F08-07.

### T3.5 Marketing shell — `page/Header.vue`, `page/Footer.vue`

- Header: "Log in" always visible (remove `hidden sm:inline-flex`); section
  links `href="/#features"` etc.; `<nav :aria-label>`; tagline sentence case,
  no tracking; logo mark solid `bg-brand`; decorative icons `aria-hidden`;
  drop `transition-all hover:-translate-y-0.5` and coloured shadows.
- Footer: hashes → `/#…`; delete the duplicate "Company" GitHub column;
  column titles `<h2 class="text-sm font-semibold">`.

Closes: F00-17, F00-39, F00-40 (marketing half).

---

## Phase 4 — Mechanical sweeps (whole `app/`, one PR each)

Run each as search → review → replace. Counts are from the scan on
2026-10-12; re-count before starting.

### T4.1 Remove redundant `aria-label` (98 buttons, 55 files)

Find: `<UiButton|<UiLinkButton|<button` elements that have `:aria-label` /
`aria-label` **and** visible text or `{{ }}` content. Delete the attribute.
Keep it on icon-only buttons and where it adds context the text lacks
(`viewDetailsLabel`, `removeMember`, `settleDebt`, document actions); in
those cases make sure the label **starts with** the visible text.
Then delete unused `a11y.buttons.*` keys from both locale files.
Fix while there: `bill/DocumentsList.vue:69` → new `a11y.buttons.downloadDocument`;
`user/profile/PersonalInfoPictures.vue:101` → no label.

Closes: F00-13, F05-01, F06-12 (name half), F07-04 (name half).

### T4.2 Tailwind grey + `dark:` → semantic tokens (815 `dark:` uses, 102 files)

Ordered replacements (apply as pairs so the `dark:` twin is removed):

| Find                                                                                                                                                                                   | Replace                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `bg-white dark:bg-gray-800` · `bg-[var(--surface)]`                                                                                                                                    | `bg-surface`                                          |
| `bg-gray-50 dark:bg-gray-900` · `bg-gray-50 dark:bg-gray-700`                                                                                                                          | `bg-surface-hover`                                    |
| `bg-gray-100 dark:bg-gray-700`                                                                                                                                                         | `bg-surface-hover`                                    |
| `text-gray-900 dark:text-gray-100` · `text-gray-950 dark:text-gray-100`                                                                                                                | `text-fg`                                             |
| `text-gray-700 dark:text-gray-300` · `text-gray-600 dark:text-gray-300` · `text-gray-600 dark:text-gray-400` · `text-gray-500 dark:text-gray-400` · `text-gray-500 dark:text-gray-300` | `text-fg-muted`                                       |
| bare `text-gray-400` (29) · `text-gray-300` (1) on text                                                                                                                                | `text-fg-muted`; on decorative icons `text-fg-subtle` |
| `border-gray-200 dark:border-gray-700` · `border-gray-100 dark:border-gray-700` · `divide-gray-100 dark:divide-gray-700`                                                               | `border-line` / `divide-line`                         |
| `border-gray-300 dark:border-gray-600` (fields)                                                                                                                                        | `border-line-control`                                 |
| `text-primary-600 dark:text-primary-400` · `text-primary-700 dark:text-primary-300`                                                                                                    | `text-brand`                                          |
| `bg-primary-600` (+hover `bg-primary-700`)                                                                                                                                             | `bg-brand hover:bg-brand-hover`                       |
| `text-error-600 dark:text-error-400`                                                                                                                                                   | `text-danger-fg`                                      |
| `text-success-700 dark:text-success-400/500` · `text-success-600 …`                                                                                                                    | `text-ok-fg`                                          |
| `text-warning-600` (7) · `text-warning-700 dark:text-warning-400`                                                                                                                      | `text-warn-fg`                                        |
| `text-[var(--X)]` / `bg-[var(--X)]` arbitrary forms                                                                                                                                    | the named utility                                     |

Raw-palette files (40 uses, 9 files): `gdpr/AccountDeletion.vue`,
`gdpr/ConsentCheckbox.vue`, `pages/settings/privacy.vue`, `bill/Card.vue`,
`gdpr/DataExport.vue`, `gdpr/ConsentVersionModal.vue`, `bill/EditModal.vue`,
`landing/LandingHero.vue`, `pages/index.vue`: every `red-|green-|orange-|blue-`
class → `.state-card--*`, `.badge-*`, or semantic utilities.

Tertiary/accent/info (≈25 uses): `pricing.vue`, `subscription/*`,
`expense/MonthlyReportCard.vue`, `settings/subscription.vue`,
`join/[token].vue`, `report/Card.vue`, `bill/DocumentsList.vue`,
`user/AccountPanel.vue`, `LandingPricing.vue` → `brand` tokens.

Marketing pages: same mapping; page background `bg-bg`/`bg-surface`.

Finish: delete unused colour scales from `tailwind.config.ts`; add an ESLint
`no-restricted-syntax`/`vue/no-restricted-class` rule banning `dark:` and
`(text|bg|border)-(gray|red|green|blue|orange)-\d` in `app/`.

Closes: F00-01, F00-05, F01-05 (contrast), F01-13, F02-01, F02-08 (colour),
F03-03, F03-11, F04-02 (contrast), F04-03, F05-03, F05-09, F06-03, F06-05
(colour), F07-02, F07-14, F08-04, F08-05.

### T4.3 `transition-all` (26, 18 files)

→ `transition-colors`, or `transition-[transform,opacity]` where a transform
is the point. Remove `hover:-translate-y-*`, `hover:scale-*`,
`active:scale-*` everywhere except none.

Closes: F00-26, F01-16.

### T4.4 Emoji and literal glyphs (33 emoji, 10 files; `→ + × ✓ ✗ •`)

| File                                              | Change                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `house/BillsPreview.vue`                          | `billEmoji()` → `billIcon()` returning heroicon names; render `<Icon>`      |
| `bulletin/Board.vue`                              | drop 📌; `+` → button `icon="plus"`; `×` → `<Icon name="heroicons:x-mark">` |
| `dashboard/ActivityFeed.vue`, `BillsPreview.vue`  | `→` → `icon="arrow-right"` trailing                                         |
| `landing/LandingFeatures.vue`                     | 🧾💬⏰ → removed with T6.1                                                  |
| `pricing.vue`                                     | `✓`/`✗` → check/x icons + `sr-only` text (T5.1)                             |
| `subscription/PlanGate.vue`                       | 🔒 → `heroicons:lock-closed`                                                |
| `user/Profile.vue`                                | 👑/👤 → icons inside `.badge`                                               |
| `house/HouseCompleteBadge.vue`                    | `✓` → icon + `.badge-success`                                               |
| `gdpr/DataExport.vue`, `gdpr/AccountDeletion.vue` | remove 📦 ⏳                                                                |
| `join/[token].vue`                                | remove 🎁                                                                   |
| `ui/LanguageSwitcher.vue`                         | drop flag emoji from options                                                |
| i18n `gdpr.privacyLink`/`termsLink`               | remove trailing ` →`; delete the `.replace(' →','')` calls                  |

Closes: F03-06, F07-07, F08-09, F02-12, F01-06 (glyph half), F04-10 (emoji), F08-11 (arrow).

### T4.5 Uppercase tracked micro-labels (35, 19 files)

Remove `uppercase tracking-wider|widest|[0.2xem]|tighter`; labels become
`text-xs font-medium text-fg-muted` sentence case. Includes `.stat-label`,
`.note-author`, `.data-table th`. Where the pattern is label/value pairs
(`bill/BasicInfo`, `CostInfo`, `ContractInfo`, `house/InformationCard`,
`expense/ViewModal`, `user/profile/InfoField`), convert to `<dl><dt><dd>`.

Closes: F01-14, F03-14, F04-12, F05-14, part of F07-06.

### T4.6 Inline `style` attributes (27 static, 12 files)

Replace with classes. Largest: `bulletin/Board.vue`, `house/BillsPreview.vue`,
`dashboard/ActivityFeed.vue`, auth pages. Keep `:style` bindings that carry
runtime values.

Closes: F03-12, F02-13.

### T4.7 Decorative infinite motion

Delete `animate-pulse` on status dots (`expense/CardMobile.vue:148`,
`expense/ViewModal.vue:145`, `report/Card.vue:26`), `animate-pulse-slow`
(`balance/index.vue:44`), `animate-pulse` on drag (`UploadDocumentDropzone`).

Closes: F04-07, F06-15.

### T4.8 Forms that are not forms

Every modal with a submit button becomes `<UiModal as="form" @submit>` (T2.3)
with `type="submit"` on the primary button and no `@click` on it; delete the
component-level Escape listeners. Files: `bulletin/Modal.vue`,
`house/Modal.vue`, `house/EditModal.vue`, `bill/Modal.vue`,
`bill/EditModal.vue`, `expense/EditModal.vue`,
`user/profile/PersonalInfoForm.vue` (plain `<form>`).
Submit buttons are never `disabled` for validity; validate in the handler,
set `error` + `hint` on the field, focus the first invalid one. Keep
`disabled` only while `loading`.
Replace raw `<input>/<textarea>/<select>` with `UiInput`/`UiSelect` in:
`bulletin/Modal.vue`, `house/Modal.vue`, `house/EditModal.vue`,
`bill/EditModal.vue`, `house/MembersCard.vue:250`, `expense/FilterBar.vue`,
`expense/MonthlyReportCard.vue`, `report/Form.vue`.
"(optional)" moves into the label; remove the helper `<p>`s.
Amount fields: `inputmode="decimal" step="0.01" min="0"` + currency `suffix`.

Closes: F02-05, F03-08, F03-09, F04-08 (form half), F05-07 (form half),
F05-08, F06-05, F07-03, F07-08 (field half).

---

## Phase 5 — Page-level tasks

### T5.1 Pricing source of truth — new `app/utils/plans.ts`; `pricing.vue`, `landing/LandingPricing.vue`, `subscription/PaywallModal.vue`, `subscription/PlanGate.vue`

`plans.ts` exports ids, i18n name keys, monthly/annual amounts (answer to D5).
All three surfaces read it and format with `formatAmount()`.
`pricing.vue`: `definePageMeta({ layout: 'legal' })`; plan names `h2`;
feature lists with icons + `sr-only` "Included/Not included"; headline price
is the amount actually charged, per-month equivalent as the note; billing
period as a two-option toggle instead of the grey "or monthly" link;
emphasis card uses `border-brand`, not `tertiary`.
`PaywallModal`: remove inner `p-6`.
`PlanGate`: locked wrapper gets `inert`; overlay becomes a plain
`bg-surface/90` row with lock icon, text, and `<UiButton size="sm">` whose own
`@click` opens the paywall; no blur.

Closes: F01-04, F01-05, F01-06, F01-07, F01-08, F04-01, F04-02, F04-10.

### T5.2 Auth & join

- `AuthShell.vue`: absorb `.confirm-body`, `.confirm-actions`,
  `.auth-success-*`; card padding `24px 20px` under 480px; logo mark solid.
  Delete the `.auth-bg::before/::after` blocks from all five pages.
- `auth/Icon*.vue`: replace with `<Icon>` (keep `IconGoogleLogo`); delete the
  inline SVG in `confirm.vue:78`; one spinner (`heroicons:arrow-path
animate-spin`).
- `confirm.vue`: wrap the state card in `<div aria-live="polite">`.
- `login.vue`: success banners `role="status"`.
- `register.vue`: Google button `aria-disabled` only + guard in handler.
- `password-reset.vue`: `:hint` always shows the rule; `error` toggles colour.
- `join/[token].vue`: `layout: false` stays but wrap in `AuthShell`; preview
  banner heading → `<p class="font-semibold">`; loading `role="status"`;
  status circles → `.state-card-icon-chip--*`.
- `house/JoinInvitationCard.vue`: error/warning boxes → `.state-card--*`.
- `gdpr/ConsentCheckbox.vue`: `useId()`; remove `aria-describedby`; native
  `required`; `sr-only` "(opens in new tab)".

Closes: F02-01, F02-02, F02-04, F02-06, F02-07, F02-08, F02-09, F02-10, F02-11.

### T5.3 Dashboard (non-redesign parts)

- `dashboard/ActivityFeed.vue`: below `md` render rows as a list (reuse the
  unified expense row from T5.4 in a compact mode); table stays for `md+`.
- `house/MembersCard.vue`: delete the teleported role menu and its
  listeners; the role badge button opens `HouseRoleChangeModal` with a
  two-option radio group; button `min-h-6`, visible text is the name.
- `bulletin/Board.vue`: notes in `<ul>`; delete post-it colours and cream
  board; note = `bg-surface-hover rounded-control p-3` with author · time in
  `text-xs text-fg-muted`; delete button `size-8` icon button named
  `t('bulletin.deleteNoteBy', { author })`.
- `dashboard.vue`: "Add expense" → `navigateTo('/expenses?new=1')` and
  `expenses/index.vue` opens the modal when the query is present.

Closes: F03-01, F03-02, F03-05, F03-07, F03-13.

### T5.4 Expenses

- New `expense/Row.vue` replacing `CardMobile.vue` + `CardRow.vue`: one
  markup, CSS grid with container queries (pattern already in
  `report/Card.vue`). No per-row `UiConfirmModal`; emit `settle`.
- `expenses/index.vue`: single list; one page-level `UiConfirmModal` bound to
  `expenseToSettle`; list `pb-24 md:pb-0`; FAB
  `bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)]`,
  `transition-colors`; date group label `<h2>`; paginate ("Load more") at 50.
- `expense/FilterBar.vue`: one group of `<button aria-pressed>`; one
  `UiInput type="search"`; responsive via classes, not duplication.
- `expense/SummaryCards.vue`: one block; "You owe / Owed to you" always,
  "Total" from `md`; plain row, no icon chips.
- `expense/EditModal.vue`: `fieldset/legend` for split; `grid-cols-1 sm:grid-cols-2`.
- `expense/EmptyState.vue`: description + "Clear filter" action when filtered.

Closes: F04-04, F04-05, F04-06, F04-08, F04-09, F04-11, F04-13.

### T5.5 Bills

- Delete `bill/ErrorToast.vue`; `bills/[id].vue` uses `notificationStore.error()`.
- `bills/[id].vue`: action row `flex-wrap`; on `<sm` show Edit + a "More"
  menu (Advance, Delete); breadcrumb → `<ol>` with `aria-current`, label
  `t('a11y.breadcrumb')`; not-found → `UiEmptyState`.
- `bill/Card.vue`: whole card is the link (overlay `NuxtLink`); remove the
  cog button; overdue → `.badge-danger`; remove stray `aria-label` span.
- `bill/DocumentsList.vue`: row click = view; actions always visible; file
  tile `.state-card-icon-chip--primary`; remove the empty-state upload button
  (the dashed button below remains).
- `bill/Modal.vue` + `bill/EditModal.vue` → one `bill/FormModal.vue`
  (`bill?` prop); period picker = `fieldset` + `role="radiogroup"` of chips
  (`role="radio" aria-checked`); currency field in both modes.
- `bill/DeleteBillConfirmModal.vue`, `DeleteDocumentConfirmModal.vue` →
  `UiConfirmModal` with a default slot for the warning card; fix the
  document-delete title key.
- `bill/BasicInfo.vue`: remove the duplicate "payment period" row.

Closes: F05-02, F05-04, F05-07, F05-10, F05-11, F05-12, F05-13, F05-16.

### T5.6 Balance & reports

- `balance/SettlementRow.vue`: amount always visible as text; button label
  always `t('balance.markPaid')`; remove hover background.
- `balance/AllSettledState.vue`: no animations; render in place of
  `BalanceMyDebtsSection` when balanced. `useBalancePage.ts`: remove the
  confetti call; `package.json`: remove `canvas-confetti` and its types.
- `balance/NoBalanceState.vue` → two states (empty / error with Retry).
- `balance/PaymentActivityCard.vue`: `role="meter"` (or drop the bars and
  print both totals).
- `balance/index.vue`: remove the Refresh button; refetch on
  `visibilitychange`; person list `<ul>`.
- `reports/index.vue`: create buttons `variant="primary"`.
- `report/Card.vue`: `<h2>` = first line of description; `NuxtImg` with
  `loading="lazy"` and explicit `width/height`; `alt=""` (the card text
  describes it); one priority badge style at all widths.
- `report/Form.vue`: remove-image button always visible, `size-6`, labelled
  with the file name.
- `report/FilterBar.vue`: `aria-pressed` buttons (shared with T5.4; extract
  `UiFilterTabs` since there are now two users).

Closes: F06-01, F06-04, F06-06, F06-07, F06-09, F06-10, F06-11, F06-12,
F06-14, F06-16.

### T5.7 House & user

- `house/Modal.vue` + `house/EditModal.vue` → `house/FormModal.vue`.
- `house/[id].vue`: info/owner grid `gap-6`; remove the "Open reports" button
  from `InformationCard`.
- `house/OwnerCard.vue`: name → `NuxtLink`; remove `align-center`.
- `house/InvitationModal.vue`: URL in a read-only `UiInput` (select on
  focus); remove the extra Close.
- `user/AccountSetupWizard.vue`: hints `text-xs text-fg-muted`; error →
  `.state-card--error`.
- `user/AccountPanel.vue`: add rows linking `/settings/privacy` and
  `/settings/subscription` (the latter behind `isStripeEnabled`); Sign out
  `variant="secondary"`.
- `user/profile/PersonalInfoView.vue` + `InfoField.vue` +
  `PersonalInfoSocial.vue`: `<dl>` rows, no coloured tiles; socials rendered
  from an array with monochrome icons.
- `user/profile/PersonalInfoPictures.vue`: delete button on the active slide
  (`t('profile.pictures.removeN', { n, total })`).
- `user/profile/PersonalInfoForm.vue`: `:loading` on Save; three fieldsets;
  i18n placeholders; `autocomplete` for tel and birthday.
- `user/LeaveHouseModal.vue`: `formatAmount(Math.abs(netBalance), currency)`.
- Skeletons on both pages mirror the card layout.

Closes: F07-01, F07-03, F07-04, F07-06, F07-08, F07-09, F07-10, F07-11,
F07-12, F07-13, F08-01.

### T5.8 Settings & legal

- `middleware/auth.global.ts`: add `'/cookies'` to `publicPaths`.
- `gdpr/ConsentVersionModal.vue`: rebuild on `<UiModal persistent>`.
- `settings/privacy.vue`: `AppPageHeader`; remove the extra container
  padding; i18n the consent row title; link-buttons → `UiLinkButton`;
  visible `h2` for export.
- `gdpr/AccountDeletion.vue`: pending banner `.state-card--warning`,
  `role="status"`, no `aria-label`.
- `settings/subscription.vue`: `AppPageHeader`; remove `p-6`; add price and
  renewal/trial end; `flex-wrap`.
- `terms.vue`, `privacy.vue`: move both locales' text out of the template
  (i18n messages or one Markdown file per locale rendered by a single
  template); fill or remove the `[…]` placeholders before launch.
- `cookies.vue`: `scope="col"` / `scope="row"`.
- Legal pages: drop `max-w-none` from `prose`.

Closes: F08-02, F08-03, F08-06, F08-07, F08-08, F08-10, F08-11, F08-12,
F08-13, F08-14.

---

## Phase 6 — Redesigns (after D1–D3)

### T6.1 Landing — `pages/index.vue`, `landing/*`

Use `impeccable shape` then `craft` with PRODUCT.md as the brief. Constraints
from the audit: no gradient text, no gradient/glow backgrounds, no mock
browser chrome, no emoji, no three-up identical cards, no eyebrows, no dot
grid; hero states one concrete ledger line; features alternate layout; steps
are an `<ol>`; mocks are `aria-hidden` or real screenshots; `h1`
`text-4xl sm:text-5xl lg:text-6xl text-balance`; root `overflow-x-clip`.
FAQ keeps `<details>`; add `[&::-webkit-details-marker]:hidden`.

Closes: F01-01, F01-02, F01-03, F01-09, F01-10, F01-11, F01-12, F01-15, F01-17.

### T6.2 Headline blocks — `dashboard.vue`, `balance/NetStandingCard.vue`, `bills/index.vue`

One shared `UiSummary` (sentence + optional action + optional secondary
figure) on `bg-surface`, replacing: the dashboard greeting + four stat tiles
(delete `_stat.scss`, `dashboard/StatCard.vue`), the balance blue card, and
the bills blue banner. Dashboard leads with the user's net position and the
single next settlement; then next due bill.

Closes: F03-04, F05-06, F06-02.

### T6.3 Regenerate `DESIGN.md`

`impeccable document` against the post-Phase-5 code. Delete the "Kinetic
Gallery" text.

Closes: F00-18.

---

## Phase 7 — Verification

- [ ] `yarn lint && yarn format && yarn typecheck && yarn test` green.
- [ ] Re-run the detector: `node ~/.claude/skills/impeccable/scripts/detect.mjs --json app`
      (ignore `app/coverage/`). Expected: only `overused-font` remains (D4).
- [ ] Re-run the scratch scan (or these greps), expected zero:
      `dark:` in `app/**/*.vue`; `transition-all`; `text-gray-`; `bg-gray-`;
      `animate-bounce|bounce-`; `backdrop-blur` outside none; emoji range;
      `uppercase` with `tracking-`; `var(--text-`; `z-\[`; `<button` without `type`.
- [ ] Repeat T0.1 captures. Targets: axe 0 serious/critical on every page;
      Lighthouse a11y ≥ 95; no horizontal scroll at 320px; every interactive
      target ≥ 24px, primary actions ≥ 44px on mobile.
- [ ] Keyboard pass per page: skip link, every control reachable, visible
      focus, modals trap and restore focus, nothing operable behind a gate.
- [ ] Reduced-motion pass: no movement except opacity.
- [ ] Re-score each group with `impeccable audit`; target ≥ 16/20 everywhere.
- [ ] `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`.

---

## Traceability

Findings not listed under a task above are closed by the systemic task named
in their handoff's "Systemic refs". Quick index of where each foundation
finding lands:

| Finding | Task       | Finding | Task | Finding | Task       |
| ------- | ---------- | ------- | ---- | ------- | ---------- |
| F00-01  | T1.2, T4.2 | F00-17  | T3.5 | F00-33  | T3.4       |
| F00-02  | T1.3       | F00-18  | T6.3 | F00-34  | T2.8       |
| F00-03  | T1.1       | F00-19  | T2.1 | F00-35  | T2.9       |
| F00-04  | T1.1       | F00-20  | T2.1 | F00-36  | T2.9       |
| F00-05  | T4.2       | F00-21  | T2.1 | F00-37  | T2.9       |
| F00-06  | T2.1, T2.2 | F00-22  | T2.4 | F00-38  | T2.9       |
| F00-07  | T2.2       | F00-23  | T1.5 | F00-39  | T3.5       |
| F00-08  | T1.4       | F00-24  | T1.5 | F00-40  | T3.3, T3.5 |
| F00-09  | T1.6       | F00-25  | T1.6 | F00-41  | T1.1       |
| F00-10  | T3.1       | F00-26  | T4.3 | F00-42  | T1.6, T2.9 |
| F00-11  | T3.2       | F00-27  | T2.3 | F00-43  | T1.8       |
| F00-12  | T3.2       | F00-28  | T2.8 | F00-44  | T2.9       |
| F00-13  | T4.1       | F00-29  | T2.2 | F00-45  | T1.8       |
| F00-14  | T1.7       | F00-30  | T2.6 | F00-46  | T3.2       |
| F00-15  | T2.7       | F00-31  | T3.3 |         |            |
| F00-16  | T2.5       | F00-32  | T1.8 |         |            |

## Effort and order of return

| Phase        | Tasks | Rough size             | Findings closed                  |
| ------------ | ----- | ---------------------- | -------------------------------- |
| 1 Tokens     | 8     | ~10 files              | ≈25, including most contrast P1s |
| 2 Primitives | 9     | ~25 files              | ≈30                              |
| 3 Shell      | 5     | ~20 files              | ≈20                              |
| 4 Sweeps     | 8     | 100+ files, mechanical | ≈45                              |
| 5 Pages      | 8     | ~60 files              | ≈35                              |
| 6 Redesigns  | 3     | ~12 files, design work | ≈10                              |

If only one thing ships: Phase 1 plus T2.1–T2.3, T3.1, T3.2 and T4.1 clears
roughly 30 of the 50 P1s.
