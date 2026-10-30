# 06 — Balance & reports

Scope: `app/pages/balance/index.vue`, `app/pages/reports/index.vue`,
`app/components/balance/*` (7), `app/components/report/*` (4),
`app/composables/useBalancePage.ts` (confetti only).

Scores: A11y 2/4 · Perf 3/4 · Theming 2/4 · Responsive 2/4 · Anti-patterns 1/4 = **10/20 (Acceptable)**

## Summary

Balance is the product's core promise and it is close: a settlement list that
names who pays whom, a per-person breakdown, an explicit "nothing to pay"
state. It undercuts itself in three places. On a phone the settle button shows
only an amount, with no verb. The headline card is the hero-metric template
with 80%-opacity text. And settling up triggers confetti, a bouncing icon and
a staggered reveal, which is exactly the cheerleading PRODUCT.md rules out.
Reports has a well-wired form and proper container queries, but image removal
is hover-only and the create action is styled as destructive.

## Findings

| ID     | Sev | Cat          | Location                                                                                                            | Issue                                                                                                                                                                                                                      | Fix                                                                                                                        |
| ------ | --- | ------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| F06-01 | P1  | UX           | `balance/SettlementRow.vue:76-96`                                                                                   | Below `sm` the amount column is hidden and the button's visible text becomes the amount alone ("€47.00"). The primary action on the primary device has no verb.                                                            | Keep amount as text; button always says "Mark paid" (or "Settle €47").                                                     |
| F06-02 | P1  | A11y         | `balance/NetStandingCard.vue:14-40`                                                                                 | Label and description are white at `opacity-80` on `primary-600`: ≈3.9:1 for 14px text. Hero-metric styling: blur blob, 128px ghost icon, `tracking-widest` uppercase, `text-4xl font-black`.                              | Full-opacity `primary-50` text; plain surface card with the balance as a sentence ("You are owed €32 overall").            |
| F06-03 | P1  | A11y         | `balance/PersonCard.vue` (amount/label colour), `balance/BalanceMyDebtsSection.vue:70`                              | `text-success-600` on white/`success-50` = 3.3 / ≈3.1:1. Card borders `border-success-100` / `border-error-100` have no dark variant.                                                                                      | `text-[var(--success-fg)]`; `--success`/`--danger` tinted borders via `color-mix`.                                         |
| F06-04 | P1  | A11y         | `report/Form.vue:206-216`                                                                                           | Remove-image button is `opacity-0` until hover (unreachable on touch), 20px, and every one has the same name.                                                                                                              | Always visible, 24px+, name includes the file name.                                                                        |
| F06-05 | P1  | A11y         | `report/Form.vue:136,170,174`, `:48`                                                                                | Placeholder `gray-400` on `gray-100` ≈2.8:1; dark placeholder `gray-500` on `gray-700` ≈2.2:1; "(optional)" and counters `text-gray-400` with no dark variant; near-limit counter `text-warning-600`.                      | `UiInput` textarea variant (already AA) and token colours.                                                                 |
| F06-06 | P1  | A11y         | `report/Card.vue:43-45,108`                                                                                         | Mobile priority tag: 10px white text on `success-500` (2.28:1) for "low".                                                                                                                                                  | Use the tinted `priorityClass` pairs at every width; 12px minimum.                                                         |
| F06-07 | P2  | Anti-pattern | `balance/AllSettledState.vue`, `useBalancePage.ts:174-176`                                                          | Settling fires 120-particle confetti with no reduced-motion check, then `bounce-in-scale`, `bounce-subtle` and three staggered fades. The state is also appended at the very bottom of the page, under the explainer card. | No confetti, no bounce. Show "All settled" in place of the debts list, as a calm inline state.                             |
| F06-08 | P2  | A11y         | `balance/index.vue:38,96,130`, `BalanceMyDebtsSection.vue:30`, `PaymentActivityCard.vue:29`, `reports/index.vue:79` | Header-bar title is a `<p>`; body `h1` then sections jump to `h3`, cards to `h4`. Same `<p>`-plus-`h1` duplication on Reports.                                                                                             | `h1` in header bar; sections `h2`; cards `h3`.                                                                             |
| F06-09 | P2  | A11y         | `report/Card.vue:83-176`                                                                                            | `<article>` with no heading; `alt` is the same generic string for every report; raw `<img>` without `loading="lazy"` or dimensions; "View details" has a different `aria-label`.                                           | First line of description as `h2/h3`; `alt=""` when decorative or include report summary; `NuxtImg` + lazy + width/height. |
| F06-10 | P2  | Semantics    | `reports/index.vue:97,140`                                                                                          | "New report" and "Create first report" use `variant="danger"`. Red means destructive everywhere else.                                                                                                                      | `variant="primary"`.                                                                                                       |
| F06-11 | P2  | A11y         | `balance/PaymentActivityCard.vue:44-85`                                                                             | `role="progressbar"` for a static proportion; bar animates `width` (layout) for 600ms on every mount.                                                                                                                      | `role="meter"` or plain text ratio; `transform: scaleX` if animation stays.                                                |
| F06-12 | P2  | UX           | `balance/NoBalanceState.vue`, `balance/index.vue:156`                                                               | One state covers both "no data yet" and "request failed"; button reads "Retry" but is named "Reload".                                                                                                                      | Separate empty and error states; fix the name (F00-13).                                                                    |
| F06-13 | P2  | Consistency  | `balance/PersonCard.vue:71`, `SettlementRow.vue:39,67`                                                              | Fourth and fifth avatar renderings (gradient initials, tinted initials) next to `UiUserAvatar`. Rows have `hover:shadow-md` / hover background but are not interactive. Person list is `<div>`s.                           | `UiUserAvatar`; remove hover; `<ul>`.                                                                                      |
| F06-14 | P2  | A11y         | `report/FilterBar.vue:70-94`                                                                                        | `tablist` without panels (same as F04-05).                                                                                                                                                                                 | Same fix.                                                                                                                  |
| F06-15 | P3  | Motion       | `balance/index.vue:44`, `report/Card.vue:26`                                                                        | `animate-pulse-slow` wrapper around shimmering skeletons; pulsing dot on every unread report.                                                                                                                              | Remove both.                                                                                                               |
| F06-16 | P3  | Product      | `balance/index.vue:62-78`                                                                                           | A manual "Refresh balance" button on the page that promises an always-current balance.                                                                                                                                     | Refetch on focus/visibility; drop the button.                                                                              |
| F06-17 | P3  | Consistency  | `report/Card.vue:83` vs others                                                                                      | `dark:border-gray-800` here, `gray-700` everywhere else.                                                                                                                                                                   | Follows F00-01.                                                                                                            |

## Systemic refs

F00-01, F00-05, F00-09, F00-13, F00-22, F00-25 (bounce), F00-30 (avatars),
F04-05, F04-06, F05-06 (same hero banner).

## Working well — keep

- Settlement rows state direction in words ("Anna pays Marco") with an
  `aria-label` that includes name and amount.
- `BalanceMyDebtsSection` has an explicit zero-debt state in an `<output>`.
- `ReportForm` is a real `<form>` with `aria-invalid`, `aria-describedby`
  switching between hint and error, `role="alert"`, and a live character count.
- `ReportCard` uses container queries (`@container` / `@md:`) instead of
  duplicating markup. This is the pattern F04-04 should adopt.
- Reports distinguishes "no reports" from "no results for this filter".
