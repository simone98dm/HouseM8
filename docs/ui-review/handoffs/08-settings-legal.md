# 08 — Settings & legal

Scope: `app/pages/settings/{privacy,subscription}.vue`,
`app/components/gdpr/{DataExport,AccountDeletion,ConsentVersionModal}.vue`
(`ConsentCheckbox` is in group 02), `app/pages/{privacy,terms,cookies}.vue`,
`app/layouts/legal.vue`.

Scores: A11y 2/4 · Perf 3/4 · Theming 1/4 · Responsive 3/4 · Anti-patterns 2/4 = **11/20 (Acceptable)**

## Summary

The GDPR settings page has good bones: labelled sections, `aria-describedby`
on the delete button, `aria-busy` on async buttons, jsPDF loaded on demand.
It is also the least integrated screen in the app. Nothing links to it, it
skips the app header, and it is styled with raw Tailwind palette colours
(`green-*`, `orange-*`, `red-*`, `blue-*`) that mostly have no dark variants.
The consent-update dialog bypasses `UiModal` and has no focus management.
Legal pages render well through `prose`, but two of three hardcode both
languages in the template.

## Findings

| ID     | Sev | Cat          | Location                                                            | Issue                                                                                                                                                                                                                                                                                      | Fix                                                                                                       |
| ------ | --- | ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| F08-01 | P1  | Navigation   | whole app (grep: no `to="/settings/…"`)                             | No component links to `/settings/privacy` or `/settings/subscription`. Data export, account deletion and billing are reachable only by typing the URL.                                                                                                                                     | Add both to `UserAccountPanel` as rows (Privacy & data, Subscription).                                    |
| F08-02 | P1  | Navigation   | `middleware/auth.global.ts:11`, `page/Footer.vue:107`               | `publicPaths` lists `/privacy`, `/terms`, `/pricing` but not `/cookies`, which the public footer links to _(verify the matcher; if exact-match, visitors are bounced to login)_.                                                                                                           | Add `/cookies`.                                                                                           |
| F08-03 | P1  | A11y         | `gdpr/ConsentVersionModal.vue:42-84`                                | Hand-built dialog: no focus trap, no initial focus, focus stays on the page behind it; `role="dialog"` on the backdrop. Styled differently from `UiModal` (`rounded-2xl`, `bg-black/50`).                                                                                                  | Build on `UiModal` with a `persistent` prop (no Escape/backdrop close).                                   |
| F08-04 | P1  | Theming      | `settings/privacy.vue:59,136,153`, `gdpr/AccountDeletion.vue:72-92` | Raw palette with no dark variants: cancel banner `green-50/200/800`, accepted pill `green-100/700`, pending-deletion panel `orange-50/200/900/800`. Bright pastel blocks in dark mode. 30 raw-palette classes across these three files.                                                    | `.state-card--success/warning/error`, `.badge-success`; `text-[var(--danger-fg)]` for the danger heading. |
| F08-05 | P1  | A11y         | `settings/subscription.vue:43`                                      | Trial note `text-tertiary-600` with no dark variant: ≈1.9:1 on the dark card.                                                                                                                                                                                                              | `text-[var(--primary-hover)]` or `.badge-*`.                                                              |
| F08-06 | P1  | i18n         | `settings/privacy.vue:118`                                          | Literal "Privacy Policy & Terms" in the template.                                                                                                                                                                                                                                          | `t()` key in both locales.                                                                                |
| F08-07 | P2  | Consistency  | `settings/privacy.vue:49-54`, `settings/subscription.vue:31-34`     | Neither page uses `AppPageHeader`, so the reserved 64px header bar is empty and there is no notification bell _(verify)_. Privacy adds its own `max-w-2xl px-4 py-8` inside `.page-body` (double padding) and its own `h1` style. Subscription adds `p-6` on a `UiCard` that already pads. | Standard page pattern (F04-06); remove extra padding.                                                     |
| F08-08 | P2  | Content      | `terms.vue:17-125`, `privacy.vue` (615 lines)                       | Both languages are hardcoded in the template under `v-if="locale === 'it'"`, duplicating structure; Terms still contains `[GO-LIVE DATE]` / `[CITY]` placeholders (flagged by its own notice). `cookies.vue` already does this correctly through `t()`.                                    | Move to i18n messages or Markdown content per locale; one template.                                       |
| F08-09 | P2  | Anti-pattern | `gdpr/DataExport.vue:108-120`, `gdpr/AccountDeletion.vue:79`        | 📦 and ⏳ emoji as section art; uppercase eyebrow that repeats the (visually hidden) section heading.                                                                                                                                                                                      | Remove emoji and eyebrow; make the `h2` visible.                                                          |
| F08-10 | P2  | A11y         | `gdpr/AccountDeletion.vue:72-77`                                    | Static pending banner has `role="alert"` and an `aria-label` that replaces its content for some screen readers.                                                                                                                                                                            | `role="status"`, no `aria-label`.                                                                         |
| F08-11 | P2  | A11y         | `settings/privacy.vue:88-101`, `ConsentVersionModal.vue:67`         | Link-buttons hand-styled with `focus:ring-blue-500`; open in a new tab without saying so; label text ends in a literal " →" from the translation.                                                                                                                                          | `UiLinkButton variant="secondary"`; hidden "(opens in new tab)"; icon instead of arrow glyph.             |
| F08-12 | P2  | UX           | `settings/subscription.vue:34-62`                                   | Shows plan name only: no price, renewal/trial end date, or what the plan includes. Row does not wrap at narrow widths _(verify)_.                                                                                                                                                          | Add renewal date and price from the subscription store; `flex-wrap gap-4`.                                |
| F08-13 | P3  | A11y         | `cookies.vue:59-75`                                                 | Column headers lack `scope="col"`; row header lacks `scope="row"` (`privacy.vue` has them).                                                                                                                                                                                                | Add scopes.                                                                                               |
| F08-14 | P3  | Typography   | `layouts/legal.vue:12`, legal pages                                 | `max-w-3xl` + `prose max-w-none` gives ≈85–95 characters per line on desktop.                                                                                                                                                                                                              | Drop `max-w-none` (prose defaults to 65ch) or use `max-w-2xl`.                                            |

## Systemic refs

F00-01, F00-10 (no skip link in legal layout), F00-13, F00-21 (`aria-busy`
is added by hand here because `UiButton` lacks it), F00-27, F00-39 (legal
pages inherit the broken `#hash` nav), F01-04 (pricing source of truth),
F02-08 (`ConsentCheckbox`).

## Working well — keep

- Sectioned settings page with `aria-labelledby` per section and a described
  destructive action.
- Deletion has a pending/grace state with a cancel path.
- `jspdf` imported dynamically inside the export handler.
- `cookies.vue`: fully i18n'd, data-driven table with caption and row headers,
  `overflow-x-auto` wrapper.
- `terms.vue` incomplete-content notice uses `<aside role="note">` + `.state-card`.
