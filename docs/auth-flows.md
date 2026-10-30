# Authentication & Onboarding — High-Level Documentation

Overview of the **registration**, **login**, **email confirmation**, **onboarding**, and **invitation** flows in House-m8.
Architectural reference document: it describes the user journeys, conditions, and requirements — not the line-by-line implementation.

> Reference architecture: `Component → Page → Store → Composable → Server API → Repository`.
> All data is scoped to `project_id`. Zod validation on every server input.

---

## 1. Entry-point map

```mermaid
flowchart TD
    Start([Unauthenticated user]) --> Q{Already has an account?}

    Q -->|No| Reg[Email-first registration]
    Q -->|Yes, credentials| Login[Email/password login]
    Q -->|Yes, Google| OAuth[Login with Google]
    Q -->|Lost password| Reset[Password recovery]
    Q -->|Has an invite| Inv[House invitation flow]

    Reg --> Confirm[Email confirmation · magic-link]
    Confirm --> Wizard[Onboarding wizard]
    OAuth --> Wizard
    Inv --> RegOrLogin[Registration or Login]

    Wizard --> App([Active session · Dashboard])
    Login --> App
    OAuth --> App
    Reset --> Login
```

**Endpoints involved**

| Area                       | Endpoint                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Registration               | `POST /api/auth/register`                                                                                   |
| Email confirmation         | `GET /api/auth/verify-email`, `POST /api/auth/confirm`                                                      |
| Login                      | `POST /api/auth/signin`, `POST /api/auth/signout`, `POST /api/auth/refresh`                                 |
| Google OAuth               | `GET /api/auth/google`, `GET /api/auth/google/callback`                                                     |
| Password recovery          | `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`                            |
| Setup wizard               | `POST /api/user/complete-setup`                                                                             |
| Invitations (token link)   | `GET /api/invitation/[token]`, `GET /api/invitation/[token]/preview`, `POST /api/invitation/[token]/accept` |
| Invitations (6-digit code) | `POST /api/invitation/redeem`                                                                               |

---

## 2. Registration (email-first)

The user provides **only their email** plus consent. The password is chosen on the confirmation link (§3); the name is collected in the wizard (§4).

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant P as Page /auth/register
    participant API as POST /api/auth/register
    participant DB as DB (users)
    participant Mail as Email (Resend)

    U->>P: Enters email + accepts terms/privacy
    P->>API: { email, termsAccepted }
    Note over API: Feature flag `showSignup` must be ON,<br/>otherwise 404
    API->>API: Zod validation (valid email, termsAccepted === true)
    API->>DB: signUpEmailOnly(email) + is_first_access=true,<br/>terms_accepted_at, consent_version
    API->>Mail: Verification email with link (24h expiry)
    API-->>P: SUCCESS_MESSAGE (identical whether email is new or existing)
    Note over API,P: Anti-enumeration: response indistinguishable<br/>between new / already-registered / error
    P-->>U: "Check your inbox"
```

**Requirements & conditions**

- Feature flag **`showSignup`** enabled — otherwise the endpoint returns `404`.
- Consent is mandatory: `termsAccepted === true` (recorded as `terms_accepted_at` + `consent_version`).
- **Anti-enumeration**: new email, already-registered email, and internal failure all return the **same** success response. No verification email is re-sent for an already-existing email.
- User is created with `is_first_access = true` (wizard trigger).
- The verification email is best-effort (non-blocking send).

---

## 3. Email confirmation — magic-link

The link confirms the email. A new sign-up has no password yet, so the page asks for one first; confirming the email, storing the password and signing in then happen together.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Mail as Email
    participant P as Page /auth/confirm
    participant API as POST /api/auth/confirm
    participant DB as DB

    U->>Mail: Opens the email
    Mail->>P: Clicks link /auth/confirm?token=...
    P->>API: { token }
    API->>DB: confirmEmailVerificationToken(token)
    alt Sign-up without a password
        API-->>P: 409 PASSWORD_REQUIRED (token not used)
        U->>P: Password + confirm password
        P->>API: { token, password }
        API->>DB: one transaction: confirm email, store password hash, burn token
        API->>API: Issues JWT (access + refresh) + sets cookies
        API-->>P: success → redirect to onboarding/dashboard
    else Valid token, password already set
        API->>API: Issues JWT (access + refresh) + sets cookies
        API-->>P: success → redirect to onboarding/dashboard
    else Expired or invalid token
        API-->>P: error
        P-->>U: "Link expired" state + link to /auth/register
    end
```

**Requirements & conditions**

- Token valid for **≤ 24h** and **single-use**.
- On expired/invalid token: dedicated screen offering a restart from registration.
- A sign-up with no password answers `409 PASSWORD_REQUIRED` without using the token; the password (8–72 chars) is sent with the token and stored in the same transaction, logged as `password_set`.
- A confirmation link never replaces an existing password, and email-change links never ask for one or sign in.
- On confirmation, the JWT session (cookies) is issued — this is what unlocks access to the wizard.
- The same `confirm` endpoint also handles **OAuth** (Google) session confirmation.

---

## 4. Onboarding wizard

Active when `is_first_access === true`. The layout redirects here until setup is complete.

```mermaid
flowchart TD
    Enter([Enter the wizard]) --> Guard{is_first_access === true<br/>and email confirmed?}
    Guard -->|No| Redirect[Redirect to login / dashboard]
    Guard -->|Yes| S1

    S1{Google OAuth user?}
    S1 -->|Yes · name already set| S2
    S1 -->|No| Step1[Step 1 · First name, Last name<br/>+ live Blobatar avatar preview]
    Step1 -->|complete-setup| S2

    S2[Step 2 · 6-digit invite code]
    S2 --> Opt{Has a code?}
    Opt -->|Yes| Redeem[redeem → joins the house]
    Opt -->|Skip| Empty[Empty-state · no house auto-created]

    Redeem --> Finish
    Empty --> Finish
    Finish[load joined house · is_first_access = false]
    Finish --> App([Dashboard])
```

**Requirements & conditions**

- **Guard**: accessible only with `is_first_access === true` + confirmed email (deep-link protection).
- **Step 1** — Name:
  - First and last name; the avatar (Blobatar) is drawn from the name as it is typed.
  - Saved via `POST /api/user/complete-setup`, which sets the name only (never a password) and **rejects with 409** if setup is already complete.
  - **Google users skip Step 1** (name already set by the provider).
- **Step 2** — 6-digit invite code:
  - **Optional** — "Skip" button.
  - Skip → **existing empty-state**, no house auto-created. The user creates or joins a house later via the normal UI.
  - `OtpCodeInput` component: 6 single inputs, continuous typing, backspace navigates back, distributed 6-digit paste, `inputmode="numeric"`, `autocomplete="one-time-code"`, fully accessible.
- Uploaded profile pictures are paused, so there is no picture step.
- On finish: a redeemed code's house is loaded into the store, then `is_first_access = false` → the wizard is no longer shown.

---

## 5. Login (email / password)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant P as Login page
    participant API as POST /api/auth/signin
    participant DB as DB

    U->>P: email + password (+ rememberMe)
    P->>API: { email, password, rememberMe }
    API->>DB: signIn({ email, password })
    alt Valid credentials + verified email
        API->>API: Issues JWT + cookies (extended lifetime if rememberMe)
        API-->>P: success → dashboard
    else Email not verified
        API-->>P: "email not verified" error
        P-->>U: Prompt to confirm email
    else Wrong credentials
        API-->>P: 401 "Invalid email or password"
    end
```

**Requirements & conditions**

- Email must be verified: login with an unconfirmed email is handled with a dedicated error.
- Wrong-credentials message is **generic** ("Invalid email or password") — it does not distinguish a non-existent email from a wrong password.
- `rememberMe` extends the session lifetime.
- Session renewal via `POST /api/auth/refresh`; logout via `POST /api/auth/signout`.

---

## 6. Google OAuth

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant P as Login page
    participant Start as GET /api/auth/google
    participant G as Google
    participant CB as GET /api/auth/google/callback
    participant Conf as POST /api/auth/confirm
    participant DB as DB

    U->>P: Clicks "Continue with Google"
    P->>Start: Starts OAuth
    Start->>G: Redirect to Google (consent)
    G->>CB: Callback with code
    CB->>Conf: Confirms OAuth session (token)
    Conf->>DB: upsert user profile
    alt First access (is_first_access)
        Conf-->>P: session + redirect to wizard (Step 1 skipped)
    else Existing user
        Conf-->>P: session + redirect to dashboard
    end
```

**Requirements & conditions**

- On first access the OAuth user enters the wizard but **skips Step 1** (name/password already provided by the provider).
- The profile is created/updated (`upsert`) on callback.
- Shares `POST /api/auth/confirm` with the magic-link flow for session issuance.

---

## 7. Password recovery

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Req as POST /api/auth/password-reset/request
    participant Mail as Email
    participant Conf as POST /api/auth/password-reset/confirm

    U->>Req: Enters email
    Req->>Mail: Email with reset link (token, expiry)
    Note over Req: Generic response (anti-enumeration)
    U->>Conf: Opens link + new password
    Conf->>Conf: Validates token + sets new password
    Conf-->>U: Password updated → login
```

**Requirements & conditions**

- Reset request → generic response regardless of whether the email exists (anti-enumeration).
- Reset token has an expiry and is single-use.
- New password subject to the same strength constraints (≥ 8 characters).

---

## 8. House invitations

Two **coexisting mechanisms**, generated together for the same invitation. Both land in the **same email** to the new member.

```mermaid
flowchart LR
    Owner([Existing member]) --> Gen[Generates invitation]
    Gen --> Mail[Email to new member]
    Mail --> Link[Token link · URL]
    Mail --> Code[6-digit code]

    Link --> Accept[GET /api/invitation/&#91;token&#93;<br/>preview → accept]
    Code --> Redeem[Wizard Step 2<br/>POST /api/invitation/redeem]

    Accept --> House([House member])
    Redeem --> House
```

| Mechanism            | How it's used                   | Endpoint                 | Notes                                   |
| -------------------- | ------------------------------- | ------------------------ | --------------------------------------- |
| **Token link (URL)** | Click the link in the email     | `[token]` preview/accept | Legacy mechanism, unchanged             |
| **6-digit code**     | Typed into Step 2 of the wizard | `redeem`                 | New; the only entry point is the wizard |

**Requirements & conditions (6-digit code)**

- **Single-use** — invalidated after the first successful use.
- **24h expiry** (aligned with the confirmation link).
- **Rate-limit + lockout** on failed attempts (10⁶ space → brute-force protection is mandatory): `code_attempts` / `code_locked_until` counters.
- Scoped to `project_id`.
- The two mechanisms **coexist**: the token link is unchanged; the code is generated in addition and included in the same email.

---

## 9. Global conditions — summary

| Condition                       | Where it applies                 | Value                               |
| ------------------------------- | -------------------------------- | ----------------------------------- |
| Feature flag `showSignup`       | Registration                     | Must be ON, otherwise 404           |
| Terms/privacy consent           | Registration                     | Mandatory, tracked with version     |
| Email confirmation token expiry | Confirmation / magic-link        | 24h, single-use                     |
| 6-digit invite code expiry      | Invitations                      | 24h, single-use                     |
| Token invite link expiry        | Invitations                      | Unchanged (existing flow)           |
| Rate-limit + lockout            | Registration, code redeem        | Anti mailbomb / anti brute-force    |
| Anti-enumeration                | register, password-reset, signin | Generic/indistinguishable responses |
| Wizard guard                    | Onboarding                       | `is_first_access` + confirmed email |
| Skip Step 1                     | Onboarding                       | Google OAuth users only             |
| Skip Step 2                     | Onboarding                       | Always allowed → empty-state        |
| Password                        | Setup / reset                    | ≥ 8 characters                      |

---

## 10. User state model

```mermaid
stateDiagram-v2
    [*] --> Registered: register (email-only)
    Registered --> EmailConfirmed: confirm (magic-link, ≤24h)
    Registered --> [*]: token expired → re-register

    EmailConfirmed --> SetupInProgress: enters the wizard
    SetupInProgress --> Active: complete-setup + is_first_access=false

    note right of Registered
        is_first_access = true
        email unverified
        no password (magic-link)
    end note

    note right of Active
        is_first_access = false
        password set
        (or OAuth profile)
    end note

    Active --> Active: login / refresh
    Active --> [*]: signout
```

---

_High-level document. For implementation detail see `docs/auth-onboarding-refactor-implementation.md` and the code in `server/api/auth/`, `server/api/invitation/`, `app/pages/auth/`, `app/components/user/AccountSetupWizard.vue`._
