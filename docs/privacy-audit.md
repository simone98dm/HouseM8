# Privacy / Cookie Audit (Phases 1-2)

Date: 2026-10-08. Audit only; no code changed. Engineering inventory, not legal advice. Items marked (?) are unverified and need a runtime check.

## Phase 1 - Structure

### Stack and injection points

- `<head>`: `nuxt.config.ts` `app.head` only has meta (viewport, theme-color, PWA meta) and icon links. No `<script>` entries, no GTM/GA, no Google Fonts `<link>`.
- `app/app.vue` sets `<html lang>`, `useSeoMeta`. `app/plugins/`: `api.client.ts`, `feature-flags.ts`, `stores.client.ts` (none load third-party scripts).
- Layouts: `app/layouts/default.vue` (authenticated app, `noindex`), `app/layouts/legal.vue` (privacy/terms), `layout: false` on `app/pages/index.vue` (landing, includes footer through `AuthShell`/page).
- Footer: `app/components/page/Footer.vue` (`<PageFooter>`) already links `/privacy` and `/terms`; it embeds `<AppFooter>` from the external layer `@simone98dm/layer` (`node_modules/@simone98dm/layer/app/components/AppFooter.vue`, "Made with love by simone98dm", link to simone98dm.dev). `default.vue` uses `<AppFooter class="app-footer-themed">` directly (layer footer only, no legal links). Footer appears in: `default.vue`, `legal.vue`, `index.vue`, `components/auth/AuthShell.vue`.
- PWA: `@vite-pwa/nuxt` is installed but commented out in `modules` and `pwa` config: no service worker, no manifest, no Workbox caches.
- Security headers via `routeRules` in `nuxt.config.ts` with CSP: `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`; `img-src 'self' data: https: blob:`; `connect-src` includes Google OAuth hosts. Any future consent-gated script needs a CSP update.
- `/privacy` and `/terms` are prerendered (`routeRules`).

### i18n

- `@nuxtjs/i18n` v10, `strategy: 'no_prefix'` (no localized URLs: `/privacy` serves both languages), `defaultLocale: 'en'`, locales `en` (en-US) and `it` (it-IT), `langDir: 'locales'`, files `i18n/locales/en.json` and `it.json`, `vueI18n: i18n.config.ts` (fallback `en`, composition API, globalInjection).
- `detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_locale', redirectOn: 'root' }`.
- Keys: nested camelCase by feature (`gdpr.*` line ~1195, `legal.*` ~1282, `landing.footer.*` ~1309, `seo.titles.*`, `profile.settings.language`). A `$t`/`t('key')` rule applies to every string.
- Legal pages `app/pages/privacy.vue` (~384 lines) and `terms.vue` (126 lines) hold the full text inline per locale using `v-if="locale === 'it'"`, not i18n keys. Only the warning banner uses keys (`legal.incompleteNotice.*`).

### Design system

- Tailwind 3 (`tailwind.config.ts`, `darkMode: 'class'`, plugins forms/typography/container-queries), SCSS in `app/assets/css/` (`_tokens.scss` CSS variables: `--bg --surface --fg --fg-muted --border --primary --secondary --danger --success`, light/dark; `_fonts.scss`, `_base.scss`, `components/`, `features/`, `layout/`). Component classes such as `state-card`, `state-card--warning`.
- Font: Plus Jakarta Sans, self-hosted TTF in `app/assets/fonts/` via `@font-face` in `_fonts.scss` (see below).
- Reusable UI in `app/components/ui/`: `Button.vue` (variants primary/secondary/ghost/danger, `to` prop renders NuxtLink), `LinkButton.vue`, `Modal.vue` (native `<dialog>`, focus trap, Escape, restores focus), `ConfirmModal.vue`, `Switch.vue` (`v-model` boolean, `label`/`ariaLabel`, sizes), `Checkbox.vue` (renders toggle-switch shape), `Card.vue`, `Notification*.vue`, `LanguageSwitcher.vue`.
- Existing GDPR UI: `app/components/gdpr/` (`ConsentCheckbox.vue`, `ConsentVersionModal.vue`, `DataExport.vue`, `AccountDeletion.vue`), `app/pages/settings/privacy.vue`.
- Conventions: props via destructuring (no `withDefaults`), tuple-style emits, tests in `__tests__/` next to components.

### Existing privacy/cookie solutions

- No cookie banner, no Iubenda/Cookiebot/etc.
- `app/pages/privacy.vue` (it + en, v1.0): placeholder controller `[Company name]`, `[GO-LIVE DATE]`, `[Provider hosting]`; data/purposes/legal-basis table; sub-processors Google, Resend, Stripe (SCCs claimed); extra-EU transfers; retention; rights (paths in Settings > Privacy); complaint to Garante; cookie table (`house_m8_access_token` 15 min, `house_m8_refresh_token` session/7d, `i18n_locale` "session", plus more rows) all labelled legitimate interest. A visible "incomplete" notice is shown.
- `app/pages/terms.vue`: terms of service, no cookie content.
- Server-side GDPR already built: `server/api/gdpr/{export.get,delete-account.post,cancel-delete.post}.ts`, `server/api/cron/gdpr-cleanup.ts` (Vercel cron 04:00 daily), `PostgresGdprRepository`, migration `database/010_gdpr.sql` (soft delete, `consent_version`, `terms_accepted_at`, `gdpr_requests`, pseudonymize function).

## Phase 2 - Inventory

### Third-party scripts / embeds / pixels

None found in app code, `nuxt.config.ts`, `package.json`, `public/`, or built `.output`: no GTM/GA, pixels, chat, heatmap, Sentry/error tracking, captcha, newsletter, iframes, video embeds. `@configcat/sdk` is server-side feature flags only (no user data sent).

Only third-party script reference: `server/api/docs.get.ts:24` loads `https://cdn.jsdelivr.net/npm/@scalar/api-reference` on the API docs page `/api/docs` (developer docs, not the user app; jsDelivr receives visitor IP). Category: necessary-ish/technical for a dev page; recommend self-hosting or gating the route (and drop jsdelivr from CSP) to be clean.

### External-domain resources

| Item                    | Where                                                                                                                                                                                                                                                                                                       | IP to third party?             | Verdict                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Fonts            | Not used. Fonts self-hosted: `app/assets/css/_fonts.scss` `@font-face` to `app/assets/fonts/*.ttf`; `tailwind.config.ts` fontFamily Plus Jakarta Sans. `@nuxt/fonts` (via dep and layer) is installed but built `.output` contains no `fonts.googleapis`/`gstatic` reference (grep empty).                  | No                             | OK. (?) confirm in browser network tab on production build, since `@nuxt/fonts` could fetch if a family lacks a local `@font-face`.                                                            |
| Icons                   | `@nuxt/icon` with `@iconify-json/{heroicons,mdi,logos}` installed (local bundles). Default `@nuxt/icon` can fall back to Iconify API `api.iconify.design` for icons not bundled/server-bundled.                                                                                                             | (?) possibly                   | Verify at runtime no request to iconify.design; if present, set `icon.provider: 'none'`/serverBundle local. CSP `connect-src` does not allow it, so any fallback would be blocked client-side. |
| Avatars / remote images | `profile_pictures`/`avatar_url` are user-uploaded URLs (storage provider is a stub in `server/providers/storage/factory.ts`, no real bucket configured). Social links are plain `<a>` to instagram/twitter/linkedin/tiktok (no load). CSP `img-src https:` allows any remote image. No gravatar/ui-avatars. | Only if users set remote URLs  | Note in policy.                                                                                                                                                                                |
| Google OAuth            | `server/api/auth/google/*` redirects to `accounts.google.com`, token/userinfo from `oauth2.googleapis.com`, `googleapis.com`. User-initiated, server-side.                                                                                                                                                  | Yes (user navigates to Google) | Necessary/contract; processor listed in privacy page.                                                                                                                                          |
| GitHub                  | links in footer only                                                                                                                                                                                                                                                                                        | No load                        | n/a                                                                                                                                                                                            |

### Stripe

Server-side only: `stripe` SDK in `server/utils/stripe.ts`, `server/api/stripe/{checkout,portal,subscription,webhook}`. No Stripe.js, no `js.stripe.com`, no `@stripe/*` in client deps. Checkout and billing portal are redirects to stripe.com (Stripe-hosted; Stripe sets its own cookies on its own domain, not ours). Sent to Stripe: user email, `metadata.user_id`, price id. Feature-flagged (`stripe-integration`).

### Email

Resend (`server/utils/email.ts`, `server/emails/index.ts`): recipient email, name, links (verify, reset, invite, deletion/cancel, bills reminder, monthly reports). US provider (?) transfer mechanism to confirm.

### Client storage (own code)

| Key                                                                                           | Type           | File                                                                                                 | Purpose                 | Duration                                                                                | Party | Category                                                                           |
| --------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| `auth_redirect`                                                                               | sessionStorage | `app/pages/auth/login.vue:64`, `register.vue:79`, read/removed `app/middleware/auth.global.ts:15,21` | return path after login | tab session, removed after use                                                          | 1st   | necessary                                                                          |
| `nuxt-color-mode` (default key of `@nuxtjs/color-mode`, not overridden in `colorMode` config) | localStorage   | module `nuxt.config.ts` colorMode (`preference: 'system'`)                                           | light/dark preference   | persistent until cleared                                                                | 1st   | preferences (user-requested, treat as functional) (?) key name from module default |
| `i18n_locale`                                                                                 | cookie         | `nuxt.config.ts` `detectBrowserLanguage.cookieKey`                                                   | language choice         | module default maxAge 365 days (?) (privacy.vue states "session": inconsistent, verify) | 1st   | preferences/functional                                                             |
| no `document.cookie`, no `useCookie`, no IndexedDB, no Pinia persist in own code              |                |                                                                                                      |                         |                                                                                         |       |                                                                                    |
| no service worker / caches (PWA module disabled)                                              |                |                                                                                                      |                         |                                                                                         |       |                                                                                    |

### Server cookies (`server/utils/jwt.ts`, `server/api/auth/google/*`)

| Cookie                                | Set at                                                         | Flags                                            | Duration                            | Purpose                          | Category  |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------- | -------------------------------- | --------- |
| `house_m8_access_token`               | `jwt.ts:129,212`                                               | httpOnly, secure (non-dev), SameSite=Lax, path=/ | 15 min                              | authentication JWT               | necessary |
| `house_m8_refresh_token`              | `jwt.ts:139`                                                   | httpOnly, secure, Lax, path=/                    | session, or 7 days if "remember me" | session refresh                  | necessary |
| `oauth_state`                         | `server/api/auth/google/index.get.ts:38` (deleted in callback) | httpOnly, secure, Lax                            | 10 min                              | CSRF protection for Google login | necessary |
| No CSRF cookie, no analytics cookies. |

### Hosting / infra / logging

- `vercel.json` (crons: `/api/bulletin-notes/cleanup` 03:00, `/api/cron/gdpr-cleanup` 04:00) suggests Vercel hosting (US company; EU region not configured in repo (?)). GitHub Actions only for CI/release. No Dockerfile; `docker-compose.yml` local.
- DB: PostgreSQL via `pg`, host from env (`POSTGRES_URL`); `database/prod-ca-2021.crt` suggests Supabase-hosted Postgres in production (?). Region unknown.
- Rate limit `server/middleware/rate-limit.ts`: in-memory map keyed by socket IP and by submitted email (transient, not persisted, no log).
- Logging: `consola`; `server/api/users/me.get.ts:39` logs `userId` on error; no email/IP logging found in `consola` calls except error payloads from providers (not exhaustively verified).

### Personal data processed server-side (for Art. 13)

- `users`: email, password hash (bcrypt), first/last name, avatar_url, birthdate, bio, gender (special-category-adjacent per privacy page: Art. 9 consent claimed), is_smoker, birthplace, nationality, occupation_type, study_field, job_title, languages, pets, telephone, instagram/twitter/linkedin/tiktok handles, profile_pictures, preferred currency, `is_first_access`, `terms_accepted_at`, `consent_version`, `deleted_at`, timestamps.
- `houses`, `house_members` (membership/role), `house_invitations` (invited_email, code; email anonymised on use by trigger), `expenses`, `expense_shares`, `bills`, `bill_documents` (uploaded documents), `bill_reminders`, `bulletin_notes`, `comments`, `reports`, `report_images`, `monthly_reports`, `referral_rewards`, `subscriptions` (stripe customer/subscription id, plan, status), `email_verification_tokens`, `password_reset_tokens`, `gdpr_requests` (audit log). `oauth_tokens` dropped (migration 010).
- Sent to: Stripe (email, user_id, plan), Resend (email, name, content of notifications), Google (OAuth identity: email, profile), hosting and DB providers.
- Retention logic present: access token 15 min; refresh 7 days max; account deletion = 30-day soft delete then pseudonymization (`pseudonymize_user`, cron daily); expired unverified email tokens and unused expired invitations deleted by cron; bulletin notes cleanup cron; financial history retained in anonymised form. Gaps: no retention for `password_reset_tokens`, `gdpr_requests`, report/bill documents files, backups, application logs; none stated.

## Verdict

**The site uses ONLY technical/necessary cookies and storage plus user-requested preference storage. No consent-requiring items were found.** No analytics, pixels, third-party embeds, or remote font loading in the user-facing app.

Consent-relevant / to-verify items:

1. `i18n_locale` cookie and `nuxt-color-mode` localStorage: preference/functional storage set only on explicit user choice (language switcher, theme) or browser-language detection. Generally exempt under the ePrivacy "strictly necessary / user-requested" reading but regulators vary; the lowest-risk option is to keep them (document in cookie policy) and optionally set `detectBrowserLanguage.useCookie: false` to avoid writing the cookie on first visit. Legal decision required.
2. `/api/docs` loads Scalar from jsDelivr (IP to third party). Fix by self-hosting the bundle or removing the route in production; not user-facing, so no banner needed.
3. `@nuxt/icon` Iconify API fallback and `@nuxt/fonts` provider fetching: verify at runtime that no request to `api.iconify.design` or `fonts.googleapis.com` occurs; if either appears, self-host/disable.
4. Minor: privacy.vue says `i18n_locale` is "Sessione"; actual duration is likely 1 year (module default); missing rows for `oauth_state`, `nuxt-color-mode`, `auth_redirect` should be added.

Conclusion: a consent banner is not required for the current implementation (necessary + functional storage only), provided items 2-3 are verified. An information-only notice plus a cookie policy listing the storage above (and linking it from `PageFooter` and `AppFooter` usage in `default.vue`) is sufficient. A full accept/reject banner becomes necessary only if analytics/marketing/third-party embeds are added later.

Related legal flags for later phases: controller identity placeholders, hosting provider/region, Art. 9 treatment of gender/smoker data, SCC/DPF status of Google/Resend/Stripe/Vercel, DPO need, retention periods.

## Remediation (2026-10-08)

Decision: no consent banner (only necessary + preference storage). Legal information only.

- Single source of truth: `app/utils/legal/cookies.ts` (every cookie/storage item, policy version and date, controller name and contact email). Verified values: `i18n_locale` lasts 365 days (`@nuxtjs/i18n` v10 `useI18nCookie`), `nuxt-color-mode` is the `@nuxtjs/color-mode` default `storageKey`.
- New `/cookies` page (`app/pages/cookies.vue`, prerendered), table generated from the data file; `privacy.vue` links to it and no longer holds its own cookie table.
- `privacy.vue` rewritten for art. 13 with controller simone98dm (natural person; email is the only rights channel). All `[[DA COMPLETARE]]` placeholders are resolved (processors Vercel/Supabase, per-provider transfer mechanisms, retention periods) and the "incomplete" notice is removed from `privacy.vue`.
- Retention enforcement: `runScheduledCleanup()` now also deletes expired/used `password_reset_tokens` and closed `gdpr_requests` older than 12 months (deletion requests are set to `completed` by `pseudonymize_user`).
- Footer: cookie link in `PageFooter`; new `LegalLinks` component used in the authenticated `default` layout and `AuthShell` (landing and legal pages already use `PageFooter`).
- `/api/docs` already returns 404 when `NODE_ENV === 'production'`, so jsDelivr is never contacted in production; the CSP allowance is left because it is needed for dev-only docs.
- `@nuxt/icon`: default `fallbackToApi: true` could reach `api.iconify.design` from the server for uncovered collections; set `icon.fallbackToApi: false` (all used prefixes are installed locally).
- `@nuxt/fonts`: all remote providers disabled in `fonts.providers`; Plus Jakarta Sans stays self-hosted.
- Stripe removed from Privacy Policy while the `showStripe` ConfigCat flag is off; re-add sections 5/6/7 + payment purpose when enabling. Vercel Hobby forbids commercial use, so a Pro plan is needed when enabling payments; Pro runtime logs are kept 1 day, so update the retention text. `/api/stripe/*` now returns 404 server-side while the flag is off.
