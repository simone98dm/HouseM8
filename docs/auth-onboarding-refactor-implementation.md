# Auth & Onboarding Refactor — Implementation Plan

**Date:** 2026-07-01

## Goal

Refactor House M8 registration into an email-first, passwordless, magic-link
flow. `/auth/register` collects only email + GDPR consent. A confirmation link
is a magic-link that verifies the email, mints a JWT session, and drops the user
into a rewritten onboarding wizard where they set name + password (skipped for
Google OAuth users) and optionally redeem an 8-digit single-use house invite
code. "Add member" now generates an 8-digit code and emails it. Success = a new
user can register with only email+consent, confirm via link (auto-logged-in),
complete the wizard, optionally join a house by code, and `is_first_access` is
cleared — with brute-force protection on the code, zero hardcoded strings, full
a11y, and passing unit tests.

---

## Context Summary (verified against current code)

### Affected 4-layer map

- **Component:** `app/components/user/AccountSetupWizard.vue` (rewrite steps), new `app/components/ui/OtpCodeInput.vue` (8-digit), `app/components/GdprConsentCheckbox.vue` (reuse as-is).
- **Page:** `app/pages/auth/register.vue` (strip to email+consent), `app/pages/auth/confirm.vue` (switch token branch to POST /confirm to get session).
- **Store:** `app/stores/user.ts` (`register` action signature changes at line 141).
- **Composable:** `app/composables/useAuth.ts` (`register` at line 123), `app/composables/useUserApi.ts` (add set-password + redeem-code), `app/composables/useHousesApi.ts` (member invite by code).
- **Server API:** `server/api/auth/register.post.ts`, `confirm.post.ts`, `verify-email.get.ts`, new redeem endpoint, member-invite endpoint.
- **Repositories (server):** `PostgresAuthProvider.ts`, `PostgresHouseRepository.ts` (GOD NODE, 18 edges).
- **DB:** new migration `database/011_auth_onboarding.sql`.

### Key current-state facts (do not regress)

- `register.post.ts` TODAY: Zod `{email, password, firstName, lastName, termsAccepted}`; gated by feature flag `new-users`; calls `authProvider.signUp({email,password,firstName,lastName})`; then `repos.users.update(id, {is_first_access:true, terms_accepted_at, consent_version:'1.0'})`; creates verification token; sends `sendRegistrationEmail`; **also immediately mints auth tokens** (this eager login must be removed — session is only issued at confirm time now).
- `PostgresAuthProvider.signUp` (line 139) **requires** `password` (bcrypt-hashed) and inserts `first_name`/`last_name` into `users`. Both `users.first_name` and `users.last_name` are `NOT NULL` (001 schema lines 18-19); `password_hash` is nullable. → A passwordless, name-less signup path is required.
- `email_verification_tokens` (001 schema line 177) declares `first_name`/`last_name` as `NOT NULL`, but `createEmailVerificationToken` (line 192) INSERT **omits** them. This is a latent inconsistency — the migration must `DROP NOT NULL` on those columns so email-only registration cannot fail.
- `createEmailVerificationToken` (line 192) already uses **24h** expiry. Good — reuse unchanged.
- `verifyEmail(token)` (line 227) verifies + sets `users.email_confirmed_at` + marks token `used_at`, but returns only `boolean`. The magic-link needs the user identity to mint a JWT → a new provider method that verifies AND returns `{userId, email}` is required (or refactor `verifyEmail` to return identity).
- `confirm.post.ts` TODAY is **OAuth-only** (`confirmOAuthSession`, Supabase tokens). Must gain a branch: given an email-verification `token`, verify it and call `generateAccessToken`/`generateRefreshToken`/`setAuthCookies` (utilities already imported there).
- `confirm.vue` token branch currently calls `GET /api/auth/verify-email` (no session) then redirects to `/auth/login`. Must be changed to `POST /api/auth/confirm {token}` (sets cookie) then redirect to `/dashboard` (wizard auto-triggers).
- Wizard trigger: `app/layouts/default.vue` line 30 shows the wizard when `userStore.currentUser?.is_first_access === true`. Reuse unchanged as the onboarding guard. Wizard emits `submit` with `UpdateProfilePayload` and today sets `is_first_access:false`.
- `resetPassword(token,newPassword)` exists (line 384, updates `password_hash`). Add a sibling `setPassword(userId,newPassword)` for wizard step 1.
- Rate-limit middleware `server/middleware/rate-limit.ts` already exists with a `RATE_LIMITED_PREFIXES` array (currently signin/password-reset/refresh, 10 req/min). **Reuse** by adding the new prefixes — do not build a new limiter.
- Existing token invites (GOD NODE `PostgresHouseRepository`): `createInvitation(houseId,email,invitedBy)` (line 391, UUID token, **48h**), `getInvitationByToken` (414), `acceptInvitation` (428, single-use txn), `addMember` (238). Consumed by `server/api/invitation/[token]/accept.post.ts`, `[token].get.ts`, `preview.get.ts`, `houses/[id]/join.post.ts`, `houses/[id]/invitation/generate.post.ts`. These must keep working.

### God-node risk & DECIDED code strategy (per orchestrator)

`PostgresHouseRepository` (18 edges) gains new methods for the 8-digit code.
**DECIDED (Q1, treat as final):** the 8-digit code **coexists with** the existing
URL token invite — it does **not** replace it. The "add member" email carries
**BOTH** the existing URL token link **AND** the new 8-digit code (24h, single-use).
The code is entered manually **only** on wizard Step 2 (no other entry point).
The token flow (`invitation/[token]/accept`, `[token].get`, `preview.get`,
`houses/[id]/join`, `houses/[id]/invitation/generate`) stays **behaviorally
unchanged** — the only change to the generate path is to **also** persist a code
on the same invitation and include it in the email body.
**Additive only:** do not alter `createInvitation`/`acceptInvitation`/
`getInvitationByToken` signatures or the columns they write. Add new nullable
`code_*` columns and new methods alongside.

**Chosen storage — new columns on `house_invitations`, NOT a sibling table.**
Justification (lower risk): the code and the token belong to the _same_ logical
invitation and must ship in the _same_ email, so one row is the natural single
source of truth — no new join, no two-row bookkeeping, no risk of orphaned code
rows. A sibling table adds a table, extra repo methods, and a join for redeem,
for zero isolation benefit since the token columns are never read/written by the
code path anyway. The code gets its **own** lifecycle columns (separate expiry,
used, attempts, lockout) so it can have 24h expiry independent of the token's
48h — the token's `expires_at`/`used` are never touched by the code flow.

### project_id / multi-tenancy

House invites are scoped by `house_id` (which is `project_id`-equivalent at the house level here). Code redemption MUST resolve `house_id` from the code row and never trust a client-supplied house id. All new queries parameterized.

---

## Assumptions & Open Questions

- **Assumed:** GDPR consent uses the existing `GdprConsentCheckbox.vue` and `users.terms_accepted_at` + `users.consent_version` (already written by register today; columns from migration 010). `consent_version` stays `'1.0'`.
- **Assumed:** "email confirmed" guard for the wizard = `users.email_confirmed_at IS NOT NULL` (set by the confirm flow) AND `is_first_access === true`. Deep-link protection: the wizard page/modal only renders when both hold; a user hitting the wizard without a session is bounced by `auth.global.ts` middleware.
- **Assumed:** Google OAuth users arrive via the existing `confirmOAuthSession` branch with `first_name` + `password_hash` already set → wizard Step 1 (name+password) is auto-skipped when `currentUser.first_name` is present.
- **Assumed:** 8-digit code = digits only (`00000000`–`99999999`), stored as `TEXT` (preserves leading zeros).
- **Open (answered below with recommendations):** token-vs-code strategy; skip-invite behavior. Both are given clear recommendations in the final section — orchestrator to confirm at Gate A.
- **To confirm:** exact rate-limit thresholds for register (anti-mailbomb) and code redeem (anti-brute-force) — plan proposes register 5/min/IP+email, redeem 5 attempts then 15-min lockout per code + 10/min/IP.

---

## Ordered Task List

### Phase 0 — Branch

**Task 0.1 — Create feature branch.**

- Layer: n/a. Use the `git-branch` agent → `feature/auth-onboarding-refactor`.
- Acceptance: branch created and checked out; never work on `main`/`develop`.

### Phase 1 — Database (do first; everything depends on it)

**Task 1.1 — Create `database/011_auth_onboarding.sql`.**

- Layer: DB. Contents (all idempotent `IF EXISTS`/`IF NOT EXISTS`):
  - `ALTER TABLE users ALTER COLUMN first_name DROP NOT NULL;` and same for `last_name` (email-first users have no name until wizard).
  - `ALTER TABLE email_verification_tokens ALTER COLUMN first_name DROP NOT NULL;` and `last_name` (resolves latent inconsistency).
  - `ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code TEXT;` (8-digit member code; nullable so existing link-tokens unaffected).
  - `ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP WITH TIME ZONE;` (24h; independent of token `expires_at`).
  - `ADD COLUMN IF NOT EXISTS code_used_at TIMESTAMP WITH TIME ZONE;` (code single-use marker; token `used` untouched).
  - `ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0;`
  - `ADD COLUMN IF NOT EXISTS code_locked_until TIMESTAMP WITH TIME ZONE;`
  - `CREATE UNIQUE INDEX IF NOT EXISTS idx_house_invitations_code ON house_invitations(code) WHERE code IS NOT NULL;`
  - Rationale: dedicated `code_*` lifecycle columns keep the token flow byte-for-byte unchanged while giving the code its own 24h expiry/lockout.
- Acceptance: migration applies cleanly on a fresh DB and on top of 010; no existing column dropped/renamed. Dependencies: none.

### Phase 2 — Server repositories / providers

**Task 2.1 — Add passwordless signup to `PostgresAuthProvider.ts`.**

- Layer: Server (provider). Add `signUpEmailOnly(email: string): Promise<AuthUser | null>` that inserts a `users` row with `email` only (`password_hash`, `first_name`, `last_name` NULL), returning the same `AuthUser` shape as `signUp`. Reuse the existing "user already exists" check. `consola` for errors.
- Acceptance: creating a user with just an email succeeds; duplicate email throws the existing error (caught upstream for anti-enumeration). Dependencies: 1.1.

**Task 2.2 — Add identity-returning email confirmation to `PostgresAuthProvider.ts`.**

- Layer: Server (provider). Add `confirmEmailVerificationToken(token: string): Promise<{ userId: string; email: string } | null>` — same transaction as `verifyEmail` (validate `expires_at > NOW() AND used_at IS NULL`, set `users.email_confirmed_at`, mark token used) but return `{userId,email}` instead of boolean. Refactor `verifyEmail` to delegate to it (`return (await confirmEmailVerificationToken(token)) !== null`) so `verify-email.get.ts` still works.
- Acceptance: valid unused token returns identity and marks used; expired/used returns null. `IAuthProvider.ts` interface updated. Dependencies: 1.1.

**Task 2.3 — Add `setPassword` to `PostgresAuthProvider.ts`.**

- Layer: Server (provider). Add `setPassword(userId: string, newPassword: string): Promise<boolean>` — bcrypt-hash (reuse `hash`/`SALT_ROUNDS`) and `UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1`. Add to `IAuthProvider.ts`.
- Acceptance: password hash persisted; wrong userId returns false. Dependencies: 1.1.

**Task 2.4 — Add 8-digit code methods to `PostgresHouseRepository.ts` (GOD NODE — additive only, coexists with token).**

- Layer: Server (repository). Add to `IHouseRepository.ts` + impl. The code attaches to the **same invitation row** the token flow already creates — do NOT create a second invitation row and do NOT touch `createInvitation`:
  - `attachInviteCode(invitationId): Promise<RepositoryResponse<{ code: string; code_expires_at: string }>>` — generate a cryptographically-random 8-digit string (`crypto.randomInt(0, 1e8)` zero-padded to 8), retry on unique-index collision, `UPDATE house_invitations SET code=$2, code_expires_at=NOW()+24h, code_used_at=NULL, code_attempts=0, code_locked_until=NULL WHERE id=$1`. This is the ONLY write to the generate path, and it only sets `code_*` columns.
  - `getInvitationByCode(code): Promise<RepositoryResponse<HouseInvitation>>`.
  - `redeemInviteCode(code, userId): Promise<RepositoryResponse<HouseInvitation>>` — single transaction, `SELECT ... FOR UPDATE`; if `code_locked_until > NOW()` throw locked; if `code_used_at IS NOT NULL` throw used; if `code_expires_at < NOW()` throw expired; on success add member (reuse `addMember` SQL) + set `code_used_at=NOW(), used_by=$userId`. **Never touch the token's `used`/`expires_at`.** Keep symmetric with `acceptInvitation`.
- Acceptance: happy path adds member + marks `code_used_at` atomically; concurrent redeem of same code cannot double-add (row lock); token columns unchanged; `createInvitation`/`acceptInvitation` untouched. Dependencies: 1.1. **High-risk: god node — run `code-reviewer` after.**

**Task 2.5 — Add attempt/lockout tracking method to `PostgresHouseRepository.ts`.**

- Layer: Server (repository). Add `registerFailedCodeAttempt(code): Promise<void>` — `UPDATE house_invitations SET code_attempts=code_attempts+1, code_locked_until = CASE WHEN code_attempts+1 >= 5 THEN NOW()+INTERVAL '15 minutes' ELSE code_locked_until END WHERE code=$1`. (No-op if code doesn't exist — anti-enumeration.)
- Acceptance: 5th wrong attempt on a real code sets a 15-min lock. Dependencies: 1.1.

### Phase 3 — Server endpoints

**Task 3.1 — Refactor `server/api/auth/register.post.ts`.**

- Layer: Server API. New Zod schema `{ email: z.string().email(), termsAccepted: z.literal(true) }` — remove password/firstName/lastName. Keep `new-users` feature-flag gate. Flow: `signUpEmailOnly(email)` → on the "already exists" error **return the same generic success response** (anti-enumeration, do NOT reveal existence and do NOT resend) → `repos.users.update(id, {is_first_access:true, terms_accepted_at:new Date().toISOString(), consent_version:'1.0'})` → `createEmailVerificationToken(id, email)` (24h) → `sendRegistrationEmail({email, userName: email, confirmationLink})`. **Remove the eager `generateAuthTokens` block** (no session before confirm). Always return the same `{message}` shape whether new or pre-existing.
- Acceptance: only email+consent accepted; pre-existing email yields identical response with no new email; no session cookie set. Dependencies: 2.1.

**Task 3.2 — Add `/api/auth/register` (and redeem) to rate-limit middleware.**

- Layer: Server (middleware). In `server/middleware/rate-limit.ts` add `/api/auth/register` and `/api/invitation/redeem` to `RATE_LIMITED_PREFIXES`. For `/api/auth/register` additionally key on submitted email (mirror the signin `ip:email` pattern) to blunt mailbombing a single address.
- Acceptance: >N register calls/min from same IP+email → 429. Dependencies: 3.1.

**Task 3.3 — Extend `server/api/auth/confirm.post.ts` with a magic-link branch.**

- Layer: Server API. Add optional `token` to the Zod schema (use a discriminated/union: either `{token}` OR the existing OAuth `{access_token, refresh_token, ...}`). When `token` present: `confirmEmailVerificationToken(token)` → if null, throw 400 `Invalid or expired verification token`; else `generateAccessToken`/`generateRefreshToken`/`setAuthCookies` and return `{success:true}`. Leave the OAuth branch unchanged.
- Acceptance: POST `{token}` with a valid token sets auth cookies and returns success; expired/used token 400s. Dependencies: 2.2.

**Task 3.4 — Create `server/api/invitation/redeem.post.ts`.**

- Layer: Server API. Zod `{ code: z.string().length(8).regex(/^\d{8}$/) }`. `verifyAuthCompat(event)` (must be logged-in from magic-link). Flow: `getInvitationByCode(code)` → if not found, `registerFailedCodeAttempt` is skipped (no row) and throw generic 404 → check `code_locked_until`/`code_used_at`/`code_expires_at` (throw 423/410 as appropriate) → block if user already in a house (reuse `getCurrentForUser`, mirror `accept.post.ts` lines 63-70) → `redeemInviteCode(code, user.id)`; on the specific "wrong within lockable window" cases call `registerFailedCodeAttempt(code)` before throwing. Send the same tenant emails as `accept.post.ts` (optional, non-blocking). Scope everything by the code row's own `house_id` (never client-supplied).
- Acceptance: valid code joins house; 5 bad attempts lock for 15m; expired/used rejected; rate-limited by 3.2. Dependencies: 2.4, 2.5, 3.2. **DB-writing → security-auditor mandatory.**

**Task 3.5 — Member-invite generation ALSO emits an 8-digit code + emails both link and code.**

- Layer: Server API. Do **not** change the token behavior. In the add-member path (`server/api/houses/[id]/members.post.ts`, and/or `houses/[id]/invitation/generate.post.ts` — whichever sends the invite email): after the existing `createInvitation(...)` call, call `attachInviteCode(invitation.id)` to stamp a 24h single-use code onto the **same** invitation row. Extend the invitation email in `server/emails/index.ts` (e.g. `sendMemberInvite({email, houseName, inviterName, inviteLink, code})`) so the body contains **both** the existing URL token link **and** the 8-digit code prominently.
- Acceptance: adding a member creates one invitation row carrying token + code (code 24h/single-use); the email contains both the link and the code; the token accept/join flow is unchanged. Dependencies: 2.4. **DB-writing → security-auditor.**

### Phase 4 — Composables

**Task 4.1 — Update `useAuth.register` in `app/composables/useAuth.ts`.**

- Layer: Composable. Change `register` (line 123) to send `{email, termsAccepted}` only. Add `confirmWithToken(token)` calling `POST /api/auth/confirm {token}`.
- Acceptance: composable calls new endpoint shapes; DTO mapping preserved. Dependencies: 3.1, 3.3.

**Task 4.2 — Add onboarding calls to `app/composables/useUserApi.ts`.**

- Layer: Composable. Add `setNameAndPassword({firstName,lastName,password})` (Step 1 finish — hits a small endpoint that calls `setPassword` + `users.update` names; add `server/api/user/complete-setup.post.ts` if none exists, Zod `{firstName,lastName,password:z.string().min(8)}`, `verifyAuthCompat`) and `redeemInviteCode(code)` → `POST /api/invitation/redeem`.
- Acceptance: success/error/loading paths covered; server min-8 enforced. Dependencies: 2.3, 3.4. _(Note: if a generic user-update endpoint already exists, reuse it for names and only add the password setter — verify before creating a new endpoint.)_

**Task 4.3 — Member invite by code in `app/composables/useHousesApi.ts`.**

- Layer: Composable. Add/adjust the add-member call to surface the returned code where the UI needs it (if shown to inviter).
- Acceptance: returns code/expiry. Dependencies: 3.5.

### Phase 5 — Store

**Task 5.1 — Update `register` action in `app/stores/user.ts` (line 141).**

- Layer: Store. Change signature to `register(email: string, termsAccepted: boolean)`; drop password/name args; keep the emailSent success-message handling (lines 175-176).
- Acceptance: store compiles; callers updated (register.vue). Dependencies: 4.1.

### Phase 6 — Pages

**Task 6.1 — Strip `app/pages/auth/register.vue` to email + consent.**

- Layer: Page. Remove firstName/lastName/password/confirmPassword fields, `passwordError`, and password validation. `isValidForm = email && termsAccepted`. Call `userStore.register(email, true)`. Keep the `new-users` gate, the Google OAuth button, the "email sent" success state, and `GdprConsentCheckbox`. Remove now-unused i18n keys only if unreferenced elsewhere.
- Acceptance: form submits with email+consent; success state shows; a11y preserved (labels/aria kept). Dependencies: 5.1.

**Task 6.2 — Update `app/pages/auth/confirm.vue` token branch.**

- Layer: Page. In `handleTokenVerification`, call `POST /api/auth/confirm {token}` (instead of `GET /verify-email`). On success set `confirmed`, then `navigateTo('/dashboard')` (wizard auto-triggers via `is_first_access`). On expired/used token show a **"resend email"** action (button that re-hits register or a new `resend` endpoint — minimal: link back to `/auth/register`). Keep OAuth hash branch unchanged.
- Acceptance: valid link logs user in and lands on dashboard→wizard; expired link shows resend screen. Dependencies: 3.3.

### Phase 7 — Components

**Task 7.1 — Create `app/components/ui/OtpCodeInput.vue` (8-digit code input).**

- Layer: Component. Props via destructuring + inline defaults (NO `withDefaults`): `modelValue: string`, `length = 8`, `disabled = false`. Emits Nuxt-4 tuple: `interface Emits { 'update:modelValue': [value: string]; complete: [value: string] }`. Behavior: 8 single-digit `<input>`s, continuous forward typing, Backspace navigates to previous when empty, paste of 8 digits distributes across inputs, `inputmode="numeric"`, `autocomplete="one-time-code"`, digits-only filter. a11y: each input `aria-label` = `t('onboarding.invite.digitLabel', {n})`, a visually-hidden `aria-live="polite"` region announcing progress, visible focus ring, group labelled by `aria-labelledby`. All strings via `t()`.
- Acceptance: keyboard-only entry + paste both fill the model and emit `complete` at 8 digits; screen-reader announces position. Dependencies: none. **New component → unit test + a11y pass.**

**Task 7.2 — Rewrite `app/components/user/AccountSetupWizard.vue`.**

- Layer: Component. Replace bio/birthday/photo steps with:
  - **Step 1 (name + password):** firstName, lastName, password, confirmPassword. Client-side confirm-match; on finish call `useUserApi.setNameAndPassword`. **Skip this step entirely when `userStore.currentUser?.first_name` is set** (Google OAuth users) — build `steps` computed conditionally like the current `canUploadPictures` pattern.
  - **Step 2 (invite code, optional):** `OtpCodeInput` + a **"Skip"** button. On submit call `useUserApi.redeemInviteCode(code)`; show inline error on invalid/locked; Skip proceeds without redeeming.
  - **Finish:** emit `submit` with `{is_first_access:false}` (existing layout handler persists it).
- Acceptance: OAuth users see only Step 2; email users see both; skip works; wizard clears `is_first_access`. Reuse `UiWizard`/`UiWizardStep`. Dependencies: 7.1, 4.2. **Modified component → update `__tests__/AccountSetupWizard.test.ts`.**

### Phase 8 — i18n (both `en.json` AND `it.json`)

**Task 8.1 — Add/prune i18n keys.** Layer: i18n. New keys (namespaces indicative):

- `onboarding.wizard.step1.title`, `.firstName`, `.lastName`, `.password`, `.confirmPassword`, `.passwordMismatch`, `.passwordTooShort`
- `onboarding.wizard.step2.title`, `.subtitle`, `.skip`, `.join`
- `onboarding.invite.digitLabel` (with `{n}`), `.srProgress` (with `{filled}`/`{total}`), `.errors.invalid`, `.errors.expired`, `.errors.used`, `.errors.locked`, `.errors.alreadyInHouse`
- `auth.confirmation.expired.title`, `.message`, `.resendButton`
- `emails.memberInvite.*` (subject, body, codeLabel) for the new template
- Remove `auth.signUp` password/name keys only if unreferenced after 6.1.
- Acceptance: zero hardcoded strings in new/edited files; `en.json` and `it.json` have identical key sets; includes every `aria-label`/placeholder/title/error. Dependencies: 7.1, 7.2, 6.1, 6.2, 3.5. **Run `i18n-translator` agent.**

### Phase 9 — Tests (Vitest, `yarn test:unit`)

**Task 9.1 — Unit tests.** Layer: tests.

- `app/components/ui/__tests__/OtpCodeInput.test.ts` — typing, backspace nav, paste distribution, digits-only, emits `complete`.
- Update `app/components/user/__tests__/AccountSetupWizard.test.ts` — OAuth skip logic, step validation, redeem call, skip path.
- `app/composables/__tests__/useAuth.test.ts` — new register/confirm shapes.
- Store test for `user.ts` register new signature (under `app/stores/__tests__`).
- Server: happy/expired/used/locked paths for redeem + confirm-token branch (mirror existing auth endpoint tests).
- Acceptance: `yarn test:unit` green. Dependencies: all impl phases.

### Phase 10 — Compliance gates

**Task 10.1 — Security audit.** Run `security-auditor` on the DB-writing surface (register anti-enumeration, redeem brute-force/lockout, confirm token, member-invite). Fix every finding with risk > 5. Special focus: 8-digit space is only 10^8 — confirm rate-limit + per-code lockout + 24h expiry are all active and effective. Dependencies: Phases 1-3.
**Task 10.2 — a11y pass.** Run `a11y-compliance-fixer` on `OtpCodeInput.vue`, rewritten wizard, and edited auth pages.
**Task 10.3 — Lint/format.** `yarn lint:fix` then `yarn format:fix`.
**Task 10.4 — Rebuild graph.** `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`.

---

## Project Compliance Checklist (MANDATORY — for the implementing agent)

- [ ] `yarn lint:fix` and `yarn format:fix` run clean.
- [ ] i18n: zero hardcoded strings; every string (incl. `aria-label`, placeholder, error, `title`) in BOTH `i18n/locales/en.json` and `it.json`, identical key sets.
- [ ] a11y WCAG AA: semantic elements, visible focus, keyboard-only nav, labels on inputs, `aria-live` on the code input; `a11y-compliance-fixer` pass done.
- [ ] Security: `security-auditor` run (DB-writing feature); all findings risk > 5 fixed; parameterized queries only; Zod on every server input; `house_id` scoping enforced from the code row, never client-supplied; brute-force controls verified.
- [ ] Unit tests added/updated in `__tests__/`; `yarn test:unit` passes.
- [ ] Branch: work on `feature/auth-onboarding-refactor`; **never commit/push to `main`**; **do not commit at all — the user commits.**
- [ ] Conventions: props destructuring + inline defaults (no `withDefaults`); Nuxt 4 tuple emits; repositories only (no raw SQL in endpoints); `consola` logging; all data scoped to `project_id`/`house_id`.
- [ ] Graph rebuilt after code changes.
- [ ] God node `PostgresHouseRepository` changes are additive; `code-reviewer` run on it.

## Suggested Agent Handoffs

- `git-branch` → Phase 0.
- `nitro-api` → Phases 1-3 (migration, provider/repository methods, endpoints).
- `nuxt4-vue3-frontend-expert` / `house-m8-frontend-engineer` → Phases 4-7 (composables, store, pages, components).
- `ui-ux-tailwind-expert` → polish `OtpCodeInput.vue` + wizard.
- `i18n-translator` → Phase 8.
- `vitest-unit-tester` → Phase 9.
- `security-auditor` → Task 10.1. `a11y-compliance-fixer` → Task 10.2. `code-reviewer` → god-node review.

---

## Two Open Architectural Questions — Recommendations

### Q1. 8-digit code vs existing token-based `house_invitations`: replace or add alongside?

**DECIDED by orchestrator (final): ADD — the code coexists with the token; both ship in the same add-member email.** My recommendation concurs.
Rationale: `PostgresHouseRepository` is an 18-edge god node and the `token` mechanism is consumed by **five** endpoints (`invitation/[token]/accept`, `[token].get`, `preview.get`, `houses/[id]/join`, `houses/[id]/invitation/generate`). Ripping out `token` would touch all of them plus tests for zero gain. Storage choice = **new `code_*` columns on `house_invitations`, not a sibling table**: the code and token belong to the same logical invitation and must ship in one email, so a single row is the natural source of truth (no join, no orphaned-row risk); a sibling table would add a table + join + methods for no isolation benefit since the token columns are never read by the code path. The code carries its own `code_expires_at`/`code_used_at`/`code_attempts`/`code_locked_until` so its 24h lifecycle is fully independent of the token's 48h, and the token flow stays byte-for-byte unchanged (only `attachInviteCode` writes, only to `code_*`).

### Q2. "Skip invite" in wizard Step 2 — auto-create a house, or land on empty-state onboarding?

**Recommendation: land on the existing empty-state (no auto-create).**
Rationale: auto-creating a house pulls in the whole house-creation flow (name, address, owner role, `project_id` provisioning) inside the wizard — more surface, more validation, more tests, and it silently commits the user to owning a house they didn't ask for. The app already has a no-house dashboard state for users between houses (see `getCurrentForUser` returning null). Skipping simply finishes the wizard with `is_first_access:false` and drops the user on that existing empty state, where they can create or join a house later through the normal UI. Zero new code, no premature commitment. This is the lazy-correct default; auto-create can be added later if product wants a one-house-per-user guarantee.
