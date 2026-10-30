# 07 — House & user

Scope: `app/pages/house/[id].vue`, `app/pages/user/[id].vue`,
`app/components/house/{EditModal,HouseCompleteBadge,InformationCard,InvitationModal,OwnerCard}.vue`
(`MembersCard`, `BillsPreview`, `RoleChangeModal`, `Modal` are in group 03),
`app/components/user/*` (4), `app/components/user/profile/*` (6).

Scores: A11y 2/4 · Perf 3/4 · Theming 3/4 · Responsive 3/4 · Anti-patterns 2/4 = **13/20 (Acceptable)**

## Summary

Profile and house pages are orderly and mostly token-themed: tinted icon
tiles use `--*-subtle/-fg`, `LeaveHouseModal` explains each blocked state
with a `.state-card`, the profile form has real labels and `autocomplete`.
The gaps: onboarding wizard hint and error colours fail contrast, the profile
editor is not a form, picture deletion is a row of numbered buttons detached
from the pictures, and the house create/edit modals repeat group 03's field
problems. The view mode decorates every field with its own coloured tile.

## Findings

| ID     | Sev | Cat          | Location                                                                                                           | Issue                                                                                                                                                                                                                                            | Fix                                                                                                                           |
| ------ | --- | ------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| F07-01 | P1  | A11y         | `user/AccountSetupWizard.vue` CSS `.wizard-field-hint`, `.wizard-skip-hint`, `.wizard-error`                       | Hints: `--fg-subtle` at 11px (2.56:1 light). Error: `color: var(--danger)` `#ef4444` on an 8% red tint ≈3.5:1. This is the first screen every new user sees.                                                                                     | Hints `--fg-muted` at 12px+; error `var(--danger-fg)` on `var(--danger-subtle)` (or `.state-card--error`).                    |
| F07-02 | P1  | A11y         | `house/EditModal.vue:126,153,170`                                                                                  | Helper text `text-sm text-gray-400`, no dark variant (same as F03-03).                                                                                                                                                                           | Same fix.                                                                                                                     |
| F07-03 | P2  | A11y         | `user/profile/PersonalInfoForm.vue:121-296`                                                                        | Wrapper is a `<div>`: no submit on Enter, `required` never validated, no error summary. Save shows a hand-placed spinner icon instead of `:loading`. Only the first group has `fieldset/legend`. Social placeholders are literals (`@username`). | `<form @submit.prevent>`; `:loading`; fieldsets for "About" and "Contact"; i18n placeholders; `autocomplete="tel"`, `"bday"`. |
| F07-04 | P2  | A11y         | `user/profile/PersonalInfoPictures.vue:77-101`                                                                     | Delete controls are buttons labelled "1", "2"… below the carousel, named "Remove 1": no link to which picture. Upload button is named "Upload document".                                                                                         | Delete action on the current slide/thumbnail, named with position ("Remove photo 2 of 4"); correct i18n key.                  |
| F07-05 | P2  | A11y         | `house/[id].vue:43,95`, `house/InformationCard.vue:37`, `house/OwnerCard.vue:40`, `user/AccountPanel.vue:37,75,94` | House page: header-bar title is a `<p>`, body `h1` has bespoke styling, cards jump to `h3`. Profile: cards mix `h2 text-lg font-bold` and `h3 font-semibold` for the same visual role.                                                           | Follow the single title pattern (F04-06); card titles one level, one style.                                                   |
| F07-06 | P2  | Anti-pattern | `user/profile/PersonalInfoView.vue:61-157`, `InfoField.vue`, `PersonalInfoSocial.vue`                              | Every field gets a 40px tinted icon tile in a different colour (cake, flag, heart, briefcase…), plus full-colour brand logos for socials: a rainbow of decoration around plain label/value data. Five near-identical social blocks.              | `<dl>` with label/value rows, no tiles; one monochrome icon style; loop the socials.                                          |
| F07-07 | P2  | Anti-pattern | `user/Profile.vue:99-112`, `house/HouseCompleteBadge.vue:14-19`                                                    | 👑 / 👤 emoji concatenated into the role badge inside a template string; `✓` glyph badge with raw `success-100/700/900/300`.                                                                                                                     | `<Icon>` + `.badge-*` classes.                                                                                                |
| F07-08 | P2  | Consistency  | `house/EditModal.vue` vs `house/Modal.vue`                                                                         | Create and edit house modals are ~90% the same markup, each with a raw `<select id="currency">`, own Escape listener, submit outside a form.                                                                                                     | One `HouseFormModal`; `UiSelect`; see F03-08/09.                                                                              |
| F07-09 | P2  | Semantics    | `house/OwnerCard.vue:52`, `user/AccountPanel.vue:107`                                                              | Owner name is a `<button>` that navigates (should be a link). Sign out is a solid `danger` button; it is not destructive.                                                                                                                        | `NuxtLink`; `variant="secondary"`.                                                                                            |
| F07-10 | P2  | i18n         | `user/LeaveHouseModal.vue:96-103`                                                                                  | Balance printed with `Math.abs(netBalance).toFixed(2)`: no currency, no locale formatting.                                                                                                                                                       | `formatAmount(amount, currency)`.                                                                                             |
| F07-11 | P2  | Layout       | `house/[id].vue:102`, `house/InformationCard.vue:90-100`                                                           | Info/owner grid uses `gap-2` while the page stacks at `space-y-6`. "Open reports" is a full-width primary button inside the house-information card; it is the only in-content route to Reports.                                                  | `gap-6`; move Reports to navigation (F00-11) and drop the button.                                                             |
| F07-12 | P3  | UX           | `house/InvitationModal.vue:44,61`                                                                                  | Invitation URL is a truncated `<p>` (cannot be read or selected in full); a "Close" button duplicates the modal's X.                                                                                                                             | Read-only input with select-on-focus; remove the extra close.                                                                 |
| F07-13 | P3  | Loading      | `house/[id].vue:48-50`, `user/[id].vue:152-169`                                                                    | Skeletons are stacks of `h-8 w-1/3` bars that do not resemble the page; `aria-busy` on role-less divs.                                                                                                                                           | Mirror the card layout as Dashboard does; `role="status"`.                                                                    |
| F07-14 | P3  | Code         | `house/OwnerCard.vue:45`, `house/OwnerCard.vue:35`, `user/[id].vue:175`                                            | `align-center` is not a Tailwind class; `text-warning-600` / `text-gray-400` icons have no dark variant.                                                                                                                                         | Remove; token colours.                                                                                                        |

## Systemic refs

F00-01, F00-03 (wizard hints), F00-07, F00-13, F00-15 (carousel on profile),
F00-16 (`UiChipInput` chips), F00-30, F00-37 (wizard steps), F02-04 (no
password reveal in onboarding), F02-05 (disabled Next), F03-01 (role menu on
house page), F03-06 (emoji in bills preview), F03-08, F03-09.

## Working well — keep

- `LeaveHouseModal`: distinct, explained states for owner / unsettled balance /
  fetch error, each with the action replaced by what to do first.
- Profile form field wiring: labels, `autocomplete="given-name|family-name|email"`,
  hint on email, progressive disclosure of occupation details.
- Tinted tiles and badges use CSS-var tokens, so dark mode is correct there.
- External social links carry `rel="noopener noreferrer"`.
- House page has explicit error and access-denied states.
