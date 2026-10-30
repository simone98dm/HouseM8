# Record of Processing Activities (Art. 30(1) GDPR)

Status: DRAFT v1 (2026-10-26) · Built from the gap analysis inventory after the Wave 1 decisions (profile minimisation, `comments` dropped, `security_events` and `user_consents` added, hashed rate-limit IPs).
Maintain with `release-legal-checklist.md`. Review at least yearly.

## Controller

| Field                              | Value                                   |
| ---------------------------------- | --------------------------------------- |
| Controller                         | TODO: legal name                        |
| Address                            | TODO                                    |
| P.IVA / REA                        | TODO / TODO                             |
| PEC                                | TODO                                    |
| Privacy mailbox                    | TODO (e.g. privacy@housem8.app)         |
| DPO                                | None appointed, see `dpo-evaluation.md` |
| Representative / joint controllers | None                                    |

Processors: see `processors-and-dpas.md`. Common to all activities unless stated otherwise: data subjects are **users (adults, and minors 14-17 for the free plan)**; storage is Supabase Postgres (AWS eu-central-1); app runs on Vercel (fra1/dub1).

## Security measures (Art. 32 summary, applies to every activity)

- TLS everywhere; HTTPS-only cookies (`HttpOnly`, `Secure`, `SameSite`); strict CSP.
- Passwords hashed (bcrypt/argon2); tokens stored hashed; JWT access + refresh with rotation.
- Zod validation on all inputs; repositories only (no raw SQL in endpoints); all data scoped by `project_id`; RLS enabled.
- Rate limiting with hashed IP and email keys; `security_events` audit trail (12 months).
- Least privilege: DB and provider credentials only in Vercel env vars; no production data in dev/test.
- Encryption at rest by Supabase/AWS. Backups: TODO (finding F1: PITR or daily encrypted EU dumps; not yet enabled, update this record when done).
- Erasure by pseudonymisation after a 30-day grace period; cron-based retention clean-up.
- Breach procedure: `breach-procedure.md`.

## Activities

Legal bases and retention are **proposals** to be confirmed by the controller and counsel.

### 1. Account and authentication

| Item          | Content                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose       | Create and run the account, sign-in, sessions, email verification, password reset                                                                                                  |
| Data subjects | Users                                                                                                                                                                              |
| Data          | email, first/last name, password hash, Google account id (OAuth), refresh/verification/reset tokens (hashed), terms acceptance timestamp and policy version, age declaration (14+) |
| Legal basis   | Art. 6(1)(b) contract                                                                                                                                                              |
| Recipients    | Supabase (storage), Vercel (hosting), Resend (verification / reset emails), Google Ireland (only when using "Sign in with Google")                                                 |
| Transfers     | Vercel, Resend US: DPF + SCC. Supabase SG: SCC (TIA). Google: DPF                                                                                                                  |
| Retention     | Account lifetime; deletion request, 30-day grace, then pseudonymised. Tokens: until expiry, daily cron                                                                             |
| Security      | See common measures                                                                                                                                                                |

### 2. Optional profile shared with housemates

| Item        | Content                                                                                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Let users show optional details to housemates                                                                                                                                                                                                                                    |
| Data        | gender, bio, occupation type, study field, job title, languages, pets, telephone, instagram, twitter, tiktok, linkedin, avatar URL, profile pictures. **Not collected anymore:** birthdate, birthplace, nationality, smoking habit (columns dropped, data wiped). No Art. 9 data |
| Legal basis | Art. 6(1)(a) consent ("profile sharing"), unticked, recorded in `user_consents`, withdrawable in Settings > Privacy (withdrawal clears the fields)                                                                                                                               |
| Recipients  | Housemates in the same house (public profile DTO); Supabase; Vercel                                                                                                                                                                                                              |
| Transfers   | As activity 1                                                                                                                                                                                                                                                                    |
| Retention   | Until consent withdrawn or account pseudonymised                                                                                                                                                                                                                                 |
| Note        | Name and avatar are shown to housemates under activity 3 (contract), not under consent                                                                                                                                                                                           |

### 3. Shared household management

| Item          | Content                                                                                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose       | Core service: houses, members and roles, ownership transfer, expenses and shares, bills and reminders, monthly reports, bulletin notes, issue reports with images, invitations                                                                                                                                                         |
| Data          | house membership and role, expenses/shares/balances, settle-up records (`settlements`: payer, payee, amount, date, undo time), bills, `bulletin_notes.message`, `reports.description` and images, `houses.description` (owner-written house info), `preferred_currency`; `house_invitations.invited_email` and code (of third parties) |
| Data subjects | Users; invited persons (email only)                                                                                                                                                                                                                                                                                                    |
| Legal basis   | Art. 6(1)(b) contract; invitations Art. 6(1)(f) (inviter's request; low impact)                                                                                                                                                                                                                                                        |
| Recipients    | House members; Supabase; Vercel; Resend (reminders, reports, invitations)                                                                                                                                                                                                                                                              |
| Transfers     | As activity 1                                                                                                                                                                                                                                                                                                                          |
| Retention     | Account lifetime. On erasure: user's notes and reports (and images) deleted, memberships closed; financial rows kept in pseudonymised form because other housemates' balances depend on them. Invitation emails anonymised on use, expired ones deleted. TODO confirm period for pseudonymised financial rows                          |
| Note          | `comments` table dropped: no evaluation of individuals                                                                                                                                                                                                                                                                                 |

### 4. Transactional email

| Item        | Content                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Verification, password reset, invitations, bill reminders, monthly reports, deletion/withdrawal/billing confirmations                           |
| Data        | recipient email, name, message content, delivery metadata at Resend                                                                             |
| Legal basis | Art. 6(1)(b); service messages only, no marketing                                                                                               |
| Recipients  | Resend (US)                                                                                                                                     |
| Transfers   | US: DPF + SCC                                                                                                                                   |
| Retention   | Resend log retention per provider settings (TODO verify, minimise); nothing stored by us. Anonymised `@anon.local` recipients are never emailed |

### 5. Subscription, payment and invoicing

| Item        | Content                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Paid plans: checkout, trial, renewal, withdrawal, invoicing, tax and anti-fraud                                                                                                                                                 |
| Data        | `subscriptions.stripe_customer_id`, plan, status, dates, withdrawal waiver record (`user_consents`, purpose `withdrawal_waiver`); at Stripe: email, name, billing address, VAT id, card data (we never see card data), invoices |
| Legal basis | Art. 6(1)(b) contract; Art. 6(1)(c) tax/accounting law for invoices; Stripe also acts as **independent controller** for fraud prevention and AML (Art. 6(1)(c)/(f))                                                             |
| Recipients  | Stripe Payments Europe Ltd; SDI / e-invoicing provider TODO; accountant TODO                                                                                                                                                    |
| Transfers   | Stripe: EU/US, DPF + SCC. SDI provider TODO                                                                                                                                                                                     |
| Retention   | Contract duration; **invoices and accounting records 10 years** (art. 2220 c.c.). On erasure: subscription cancelled at period end, Stripe customer email/name/address redacted, invoices kept                                  |
| Age         | Paid plans 18+ (Terms)                                                                                                                                                                                                          |

### 6. Consent and legal acceptance records

| Item        | Content                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Prove acceptance of Terms, policy version, profile-sharing consent and withdrawal waiver (accountability, Art. 7(1))      |
| Data        | `user_consents` (user_id, purpose, version, granted_at, withdrawn_at), `users.terms_accepted_at`, `users.consent_version` |
| Legal basis | Art. 6(1)(c)/(f)                                                                                                          |
| Recipients  | Supabase, Vercel                                                                                                          |
| Retention   | Account lifetime + TODO 5 years (limitation period) in pseudonymised form                                                 |

### 7. Security events and abuse prevention

| Item        | Content                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Detect and investigate attacks and breaches (Arts. 32-33), limit brute-force and abuse                                            |
| Data        | `security_events` (user_id, event type, hashed IP, timestamp); `rate_limits.key` (hashed IP / email hash); refresh-token metadata |
| Legal basis | Art. 6(1)(f), see `lia-security-logging.md`                                                                                       |
| Recipients  | Supabase, Vercel                                                                                                                  |
| Retention   | `security_events` 12 months (automatic purge); `rate_limits` 2 hours                                                              |

### 8. Data-subject rights handling

| Item        | Content                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Handle and prove handling of requests (access, export, erasure, restriction, objection, portability)                                               |
| Data        | `gdpr_requests` (user_id, type, status, timestamps), correspondence in the privacy mailbox, ID-verification evidence (not stored beyond the check) |
| Legal basis | Art. 6(1)(c)                                                                                                                                       |
| Recipients  | Supabase; mailbox provider TODO                                                                                                                    |
| Retention   | 12 months after closure (mailbox correspondence: same)                                                                                             |

### 9. Cookies and device storage

| Item        | Content                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Session and preferences only (`house_m8_access_token`, `house_m8_refresh_token`, `oauth_state`, `i18n_locale`, colour mode, PWA caches) |
| Legal basis | Art. 122 Codice Privacy: technical items, no consent. No analytics, ads or third-party scripts                                          |
| Retention   | See `app/utils/legal/cookies.ts`. If analytics are ever added, banner per Garante 231/2021 and this record must be updated              |

### 10. Hosting and operational logs

| Item        | Content                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Purpose     | Run and secure the service (request handling, errors)                                                    |
| Data        | IP address and request metadata in Vercel runtime logs; application logs with no plaintext personal data |
| Legal basis | Art. 6(1)(f)                                                                                             |
| Recipients  | Vercel                                                                                                   |
| Retention   | Provider default (about 1 hour on current plan); TODO confirm                                            |

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
