# 02 — Auth & join

Scope: `app/pages/auth/{login,register,forgot-password,password-reset,confirm}.vue`,
`app/pages/house/join/[token].vue`, `app/components/auth/*` (8),
`app/components/house/JoinInvitationCard.vue`, `app/components/gdpr/ConsentCheckbox.vue`.

Scores: A11y 3/4 · Perf 3/4 · Theming 2/4 · Responsive 3/4 · Anti-patterns 2/4 = **13/20 (Acceptable)**

## Summary

The five `/auth/*` pages are the most consistent surface in the app: one
shell, token-based colours, labelled fields with correct `autocomplete`,
`role="alert"` errors wired to `aria-describedby`. Weak points are inherited
token contrast, duplicated scoped CSS, and decorative gradient blobs. The join
page is the outlier: it does not use `AuthShell`, has no `<main>`, wrong
heading order, a third logo, and status boxes with no dark-mode styles.

## Findings

| ID     | Sev | Cat             | Location                                                                                                                       | Issue                                                                                                                                                                                                                                                          | Fix                                                                                                   |
| ------ | --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| F02-01 | P1  | Theming         | `house/JoinInvitationCard.vue:77-88,112-123`, `join/[token].vue:94,119`                                                        | Error and warning boxes (`bg-error-50 border-error-200 text-error-700`, `bg-warning-50 … text-warning-800`) and the status circles (`bg-error-100`, `bg-success-100`) have no dark variants: bright pastel blocks on a dark card.                              | Use `.state-card state-card--error/warning` and `.state-card-icon-chip`.                              |
| F02-02 | P1  | A11y            | `join/[token].vue:33-139`                                                                                                      | No `<main>` landmark. `h2` (house name, L44) precedes the `h1` (L67). Loading block has no `role="status"`.                                                                                                                                                    | Wrap in `AuthShell`; preview banner heading becomes a `<p>`; add status role.                         |
| F02-03 | P1  | A11y            | `login.vue` CSS `.auth-forgot-link`, `AuthShell.vue` `.auth-altlink a`, `confirm.vue`/`password-reset.vue` `.confirm-redirect` | Links use `--primary` (3.68:1) at 12–13px; redirect note uses `--fg-subtle` (2.56:1).                                                                                                                                                                          | Closed by F00-03/F00-04.                                                                              |
| F02-04 | P2  | A11y            | `password-reset.vue:156-190`                                                                                                   | Password rule is shown only after the field is invalid (`:hint` is undefined until then). No show/hide toggle on any password field.                                                                                                                           | Always-visible hint; add a reveal toggle to `UiInput type="password"`.                                |
| F02-05 | P2  | UX              | `login.vue:152`, `forgot-password.vue:91`, `register.vue:168`, `password-reset.vue:194`                                        | Submit is disabled until the form is valid: no explanation, not focusable, and autofill can leave it disabled.                                                                                                                                                 | Keep enabled; validate on submit and focus the first invalid field.                                   |
| F02-06 | P2  | A11y            | `register.vue:184-198`                                                                                                         | Google button sets both `disabled` and `aria-disabled` and points `aria-describedby` at the consent hint; a `disabled` button is skipped by Tab, so the hint is never heard.                                                                                   | `aria-disabled` only, guard in the handler.                                                           |
| F02-07 | P2  | A11y            | `confirm.vue:18-48`, `login.vue:86-103`                                                                                        | Pending → success/failure swap is not announced (no live region around the state card). Success banners use `role="alert"`.                                                                                                                                    | `aria-live="polite"` wrapper; `role="status"` for success.                                            |
| F02-08 | P2  | Theming         | `gdpr/ConsentCheckbox.vue:12-43`                                                                                               | Raw `blue-600/800/300`, `red-500/300`, `accent-blue-600` instead of tokens; fixed ids (`consent-checkbox`); label is both `for` target and `aria-describedby` (read twice); `target="_blank"` links give no new-tab cue; `.replace(' →','')` on a translation. | Tokens; `useId()`; drop `aria-describedby`; visually-hidden "(opens in new tab)"; separate i18n keys. |
| F02-09 | P2  | Maintainability | all five auth pages (scoped CSS)                                                                                               | `.auth-bg::before/::after` gradient blobs, `.confirm-body`, `.confirm-actions`, `.auth-success-*` are copy-pasted per page with small differences. Blobs are decorative blue/purple radial gradients.                                                          | Move shared rules into `AuthShell`; delete the blobs.                                                 |
| F02-10 | P2  | Responsive      | `AuthShell.vue` CSS `.auth-card`, `.auth-bg`                                                                                   | Card padding is 36/32px inside 24px page padding at every width: ≈206px of content at 320px. `min-height: 100vh`.                                                                                                                                              | `padding: 24px 20px` below 480px; `100dvh`.                                                           |
| F02-11 | P2  | Consistency     | `join/[token].vue:58-66,81`, `auth/Icon*.vue`, `confirm.vue:78`                                                                | Third logo treatment (house icon on solid blue); fourth spinner implementation (`border-b-2` ring); seven hand-written auth SVG icon components plus one inline SVG while the app uses `<Icon>` everywhere else.                                               | One logo, one spinner, `<Icon>` for the rest (keep the Google mark).                                  |
| F02-12 | P3  | Anti-pattern    | `join/[token].vue:50-54`                                                                                                       | 🎁 emoji in a referral pill on an invitation screen.                                                                                                                                                                                                           | Plain sentence, no emoji.                                                                             |
| F02-13 | P3  | Code            | `forgot-password.vue:44,47`, `register.vue:119,122,198`, `AuthShell.vue:27`                                                    | Inline `style` attributes; redundant `role="main"` on `<main>`.                                                                                                                                                                                                | Classes; remove role.                                                                                 |

## Systemic refs

F00-03, F00-04 (token contrast), F00-07 (14px inputs zoom on iOS), F00-13
(aria-label on every submit button here), F00-19/20 (button style, height),
F00-29 (error announcement), F00-40 (gradient logo).

## Working well — keep

- `AuthShell` as a single frame; `--surface/--border/--fg` tokens throughout.
- `autocomplete` values (`email`, `current-password`, `new-password`,
  `one-time-code`), `type="email"`, real labels on every field.
- Form-level error with `id` + field `aria-describedby`.
- Registration-closed and email-sent states are designed, not afterthoughts.
