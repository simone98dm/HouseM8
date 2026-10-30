# API Reference

All endpoints live under `/api/` and are served by the Nitro server embedded in the Nuxt 4 app. There is no separate API service.

A machine-readable spec is at [`openapi.yaml`](../openapi.yaml). A Postman collection is at [`postman-collection.json`](../postman-collection.json).

---

## Conventions

### Authentication

All protected endpoints require a valid JWT access token in the `access_token` HTTP-only cookie (set automatically by the sign-in/OAuth flows). Endpoints call `verifyAuthCompat(event)` as the first step and return `401` if no valid token is present.

### Input Validation

Every mutating endpoint uses `readValidatedBody(event, zodSchema.parse)`. Invalid input returns `400` with a Zod error message before any business logic runs.

### Authorization Guards

| Guard                   | Function                                  | HTTP error |
| ----------------------- | ----------------------------------------- | ---------- |
| Must be logged in       | `verifyAuthCompat()`                      | 401        |
| Must be house member    | `ensureHouseMember(houseId, userId)`      | 403        |
| Must be house owner     | `ensureHouseOwner(houseId, userId)`       | 403        |
| Must be expense creator | `ensureExpenseCreator(expenseId, userId)` | 403        |
| Must be bill creator    | `ensureBillCreator(billId, userId)`       | 403        |

### Response Shape

Success:

```json
{ "data": { ... } }
```

Paginated:

```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "total_pages": 3 }
}
```

Error (Nitro `createError`):

```json
{ "statusCode": 400, "statusMessage": "Description" }
```

---

## Auth — `/api/auth/`

| Method | Path                               | Auth        | Description                                                                      |
| ------ | ---------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`               | public      | Register with email + password                                                   |
| POST   | `/api/auth/signin`                 | public      | Email/password login → sets JWT cookies                                          |
| POST   | `/api/auth/signout`                | public      | Clears JWT cookies                                                               |
| POST   | `/api/auth/refresh`                | cookie      | Rotates access token using refresh token                                         |
| POST   | `/api/auth/confirm`                | public      | Confirm email; first password for sign-ups (409 `PASSWORD_REQUIRED` without one) |
| POST   | `/api/auth/password-reset/request` | public      | Sends reset email                                                                |
| POST   | `/api/auth/password-reset/confirm` | token param | Sets new password                                                                |
| GET    | `/api/auth/google`                 | public      | Redirects to Google OAuth consent                                                |
| GET    | `/api/auth/google/callback`        | OAuth       | Completes OAuth, sets JWT cookies                                                |
| POST   | `/api/auth/oauth/refresh`          | public      | Refreshes Google OAuth tokens                                                    |

**Register body:**

```json
{
  "email": "user@example.com",
  "age_confirmed": true,
  "terms_accepted": true,
  "privacy_acknowledged": true
}
```

All three flags must be literal `true` (minimum age 14). The response is the same for new and existing emails (anti-enumeration). The password is chosen on the confirmation link (`POST /api/auth/confirm` with `password`); the name is set in the onboarding wizard (`POST /api/user/complete-setup`).

**Sign-in body:**

```json
{ "email": "user@example.com", "password": "..." }
```

---

## Users — `/api/users/`

| Method | Path                               | Auth | Description                        |
| ------ | ---------------------------------- | ---- | ---------------------------------- |
| GET    | `/api/users/me`                    | JWT  | Current user profile               |
| PUT    | `/api/users/me`                    | JWT  | Update profile fields              |
| GET    | `/api/users/[id]`                  | JWT  | Public profile of a housemate      |
| GET    | `/api/users/me/consents`           | JWT  | Active consents of the user        |
| POST   | `/api/users/me/consents`           | JWT  | Grant a consent                    |
| DELETE | `/api/users/me/consents/[purpose]` | JWT  | Withdraw a consent                 |
| POST   | `/api/users/me/accept-terms`       | JWT  | Accept current Terms and Privacy   |
| POST   | `/api/users/me/pictures`           | JWT  | Upload profile picture (multipart) |
| DELETE | `/api/users/me/pictures/[index]`   | JWT  | Remove profile picture by index    |

**`GET /api/users/me`** returns the user row plus `pending_deletion` (boolean) and `deletion_scheduled_for` (ISO date, 30 days after the request, otherwise `null`).

**`PUT /api/users/me`**: the optional profile fields (bio, gender, occupation, languages, pets, phone, social handles, ...) return `403` unless the `profile_sharing` consent is active.

**`GET /api/users/[id]`** returns a public DTO, not the user row: `id`, `first_name`, `last_name`, `avatar_url` always; the optional profile fields only while that user's `profile_sharing` consent is active. Email is never returned. `404` for users pending deletion, `403` if the two users are not in the same house.

**Consents.** The only purpose settable by the client is `profile_sharing`.

- `POST /api/users/me/consents` body `{ "purpose": "profile_sharing" }` is idempotent; the version recorded is the server's `LEGAL_POLICY_VERSION`. Returns `{ data }`.
- `GET /api/users/me/consents` returns `{ data: [...] }` with the active consents.
- `DELETE /api/users/me/consents/profile_sharing` returns `{ success: true }` and clears the optional profile fields in the same transaction. `400` for an unknown purpose.
- The `withdrawal_waiver` purpose is recorded server-side by `POST /api/stripe/checkout`.

**`POST /api/users/me/accept-terms`** body `{ "terms_accepted": true, "privacy_acknowledged": true, "age_confirmed": true }` (all literal `true`). Stores `terms_accepted_at` and `consent_version = LEGAL_POLICY_VERSION`; used by the re-acceptance modal after a policy bump and by Google sign-ups.

---

## Houses — `/api/houses/`

| Method | Path                                   | Auth   | Description                                                                                                                        |
| ------ | -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/houses`                          | JWT    | All houses the user belongs to                                                                                                     |
| POST   | `/api/houses`                          | JWT    | Create a new house                                                                                                                 |
| GET    | `/api/houses/[id]`                     | member | House details                                                                                                                      |
| PUT    | `/api/houses/[id]`                     | owner  | Partial update: name, address (`''` clears), currency, max_members (≥ active members, else 400), description (≤ 1000, `''` → null) |
| POST   | `/api/houses/[id]/archive`             | owner  | Archive the house (members lose access)                                                                                            |
| GET    | `/api/houses/[id]/members`             | member | List members                                                                                                                       |
| DELETE | `/api/houses/[id]/members/[user_id]`   | owner  | Remove a member                                                                                                                    |
| POST   | `/api/houses/[id]/leave`               | member | Leave the house                                                                                                                    |
| POST   | `/api/houses/[id]/invitation/generate` | owner  | Generate invite token                                                                                                              |
| GET    | `/api/houses/[id]/invitation/code`     | admin  | Current shareable join code or null                                                                                                |
| POST   | `/api/houses/[id]/invitation/accept`   | JWT    | Accept an invite by token                                                                                                          |

---

## Expenses — `/api/expenses/`

| Method | Path                                   | Auth    | Description                                  |
| ------ | -------------------------------------- | ------- | -------------------------------------------- |
| GET    | `/api/expenses?house_id=&page=&limit=` | member  | Paginated expense list with optional filters |
| POST   | `/api/expenses`                        | member  | Create expense + split shares                |
| GET    | `/api/expenses/[id]`                   | member  | Single expense with shares                   |
| PUT    | `/api/expenses/[id]`                   | creator | Update description/amount/dates              |
| DELETE | `/api/expenses/[id]`                   | creator | Delete expense and all shares                |
| GET    | `/api/expenses/summary`                | member  | Aggregated totals per user                   |
| POST   | `/api/expenses/shares/[id]/pay`        | JWT     | Mark share as paid                           |
| POST   | `/api/expenses/shares/[id]/unpay`      | JWT     | Mark share as unpaid                         |

**Create expense body:**

```json
{
  "house_id": "uuid",
  "description": "Groceries",
  "total_amount": 45.5,
  "currency": "EUR",
  "user_ids": ["uuid1", "uuid2"],
  "categories": ["groceries"],
  "payer_id": "uuid",
  "due_date": "2026-06-01T00:00:00Z",
  "recurring": false,
  "recurring_period": null
}
```

The server splits `total_amount` equally across all `user_ids` and inserts one `expense_shares` row per user in a single transaction. `categories` is optional: up to 3 distinct keys from `groceries`, `rent`, `utilities`, `subscriptions`, `transport`, `dining`, `household`, `health`, `entertainment`, `travel`, `gifts`, `other` (defaults to `[]`). `payer_id` is optional: it must be a house member and is stored as `created_by`; if it is not the caller, the caller must be in `user_ids`.

---

## Bills — `/api/bills/`

| Method | Path                   | Auth    | Description             |
| ------ | ---------------------- | ------- | ----------------------- |
| GET    | `/api/bills?house_id=` | member  | All bills for the house |
| POST   | `/api/bills`           | member  | Create a recurring bill |
| GET    | `/api/bills/[id]`      | member  | Bill details            |
| PUT    | `/api/bills/[id]`      | creator | Update bill             |
| DELETE | `/api/bills/[id]`      | creator | Deactivate/delete bill  |

**Create bill body:**

```json
{
  "house_id": "uuid",
  "description": "Internet",
  "monthly_cost": 30.0,
  "payment_period": 1,
  "next_due_date": "2026-06-01",
  "categories": ["utilities"]
}
```

`payment_period` is in months; allowed values: `1`, `2`, `6`, `12`. Optional `categories` (same rules as expenses) is accepted on create and `PUT`.

---

## Balance — `/api/balance/`

| Method | Path                      | Auth   | Description                             |
| ------ | ------------------------- | ------ | --------------------------------------- |
| GET    | `/api/balance/[house_id]` | member | Computed net balances + settlement plan |

Response includes:

- `user_balances[]` — per-user `total_paid`, `total_owed`, `net_balance`
- `settlement_transactions[]` — minimal set of transfers to settle debts (who pays whom)
- `total_expenses` — sum of all unpaid shares
- `is_balanced` — true if all net balances are within €0.01

---

## Bulletin Notes — `/api/bulletin-notes/`

| Method | Path                            | Auth    | Description          |
| ------ | ------------------------------- | ------- | -------------------- |
| GET    | `/api/bulletin-notes?house_id=` | member  | All active notes     |
| POST   | `/api/bulletin-notes`           | member  | Create note          |
| DELETE | `/api/bulletin-notes/[id]`      | creator | Delete note          |
| POST   | `/api/bulletin-notes/cleanup`   | cron    | Remove expired notes |

---

## Reports — `/api/reports/`

| Method | Path                       | Auth    | Description                              |
| ------ | -------------------------- | ------- | ---------------------------------------- |
| GET    | `/api/reports/user`        | JWT     | Reports submitted by current user        |
| GET    | `/api/reports/owner`       | JWT     | Reports for houses owned by current user |
| POST   | `/api/reports`             | member  | Submit a report to house owner           |
| GET    | `/api/reports/[id]`        | JWT     | Report details                           |
| DELETE | `/api/reports/[id]`        | creator | Delete report                            |
| PATCH  | `/api/reports/[id]/read`   | owner   | Mark report as read                      |
| PATCH  | `/api/reports/[id]/solved` | owner   | Mark report as solved                    |
| POST   | `/api/reports/[id]/images` | JWT     | Attach images to report                  |

---

## Stripe — `/api/stripe/`

| Method | Path                       | Auth             | Description                     |
| ------ | -------------------------- | ---------------- | ------------------------------- |
| GET    | `/api/stripe/prices`       | JWT              | VAT-inclusive display prices    |
| POST   | `/api/stripe/checkout`     | JWT              | Create Stripe checkout session  |
| POST   | `/api/stripe/withdraw`     | JWT              | Cancel / withdraw from contract |
| POST   | `/api/stripe/portal`       | JWT              | Open Stripe customer portal     |
| GET    | `/api/stripe/subscription` | JWT              | Current subscription status     |
| POST   | `/api/stripe/webhook`      | Stripe signature | Handle Stripe events            |

Webhook events handled: `checkout.session.completed` (also sends the confirmation email), `customer.subscription.updated`, `customer.subscription.deleted`.

**`GET /api/stripe/prices`** (cached 1 h) returns `{ data: { <price_key>: { unit_amount, currency, interval, tax_behavior, display_amount, vat_included, vat_rate } } }` for `pro_monthly`, `pro_annual`, `house_plus_monthly`, `house_plus_annual`. `display_amount` always includes IT VAT (22% is added when the Stripe price is tax-exclusive).

**`POST /api/stripe/checkout`** body:

```json
{ "price_key": "pro_monthly", "withdrawal_waiver": true }
```

`withdrawal_waiver` must be literal `true`; it is recorded in `user_consents` before the session is created and copied into the session metadata. The session requires Terms acceptance, billing address, collects tax IDs and uses Stripe Tax; the first subscription gets a 14-day trial. Returns `{ data: { url } }`. `409` (`data.code: SUBSCRIPTION_ALREADY_ACTIVE`) if the user already has an active or trialing subscription.

**`POST /api/stripe/withdraw`** (no body). During the trial or the first 14 days the subscription is cancelled immediately; otherwise it is cancelled at period end. Sends an acknowledgement email and logs `subscription_withdrawn`. Returns `{ data: { mode: "immediate" | "period_end", access_ends_at } }`. `400` if there is no active subscription.

---

## GDPR — `/api/gdpr/`

| Method | Path                        | Auth | Description                                        |
| ------ | --------------------------- | ---- | -------------------------------------------------- |
| GET    | `/api/gdpr/export`          | JWT  | Download all personal data as a JSON file          |
| POST   | `/api/gdpr/delete-account`  | JWT  | Request account deletion (30-day grace)            |
| POST   | `/api/gdpr/cancel-delete`   | JWT  | Cancel a pending deletion                          |
| GET    | `/api/gdpr/pending-summary` | JWT  | Per-house balances shown while deletion is pending |

**`GET /api/gdpr/export`** responds with `Content-Disposition: attachment; filename="house-m8-export-<YYYY-MM-DD>.json"`. The file covers every user-keyed table plus the user's own `security_events`. The request is logged in `gdpr_requests` and as a `data_export` security event.

**`POST /api/gdpr/delete-account`** body `{ "confirm": true }`. Returns `{ message, scheduled_for }` and emails a cancel link.

- `409` with `statusMessage: OWNER_MUST_TRANSFER` and `data.houses`: the user owns a house with other active members and must transfer ownership first.
- `502` with `statusMessage: BILLING_CANCEL_FAILED`: the Stripe subscription could not be cancelled; nothing was written, retry.
- `429`: rate limited.
- Sole-member houses are archived; the Stripe subscription is set to cancel at period end.

**`POST /api/gdpr/cancel-delete`** body `{ "token"?: string }` (the emailed link sends the token; the in-app button sends none). Returns `{ message, data: { restored_house_ids, subscription_restored } }`; `subscription_restored` is `null` when no Stripe cancellation was scheduled and `false` when resuming it failed. `404` if no deletion is scheduled (the pending-deletion page treats it as already restored). A signed-in pending user who opens the emailed link is redirected to `/account/pending-deletion?cancel_token=…`, which cancels on arrival.

**`GET /api/gdpr/pending-summary`** read-only. Returns one entry per non-archived house of the caller: `id`, `name`, `currency`, `counterparts` (`[{ user, net_cents }]`, `user` is the public profile, `net_cents` comes from the settle-up transfers).

**Pending-deletion middleware.** While an account is in the grace period every `/api/*` route returns `403` with `data.code: ACCOUNT_PENDING_DELETION`, except `GET /api/users/me`, `/api/gdpr/cancel-delete`, `/api/gdpr/export`, `/api/gdpr/pending-summary`, `/api/auth/signout`, `/api/auth/refresh` and `/api/feature-flags`.

---

## Cron — `/api/cron/`

Protected by `CRON_SECRET` header, not JWT cookies. Intended for Vercel cron jobs or external schedulers.

| Method | Path                        | Description                                                                                                               |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| ANY    | `/api/cron/bills-reminder`  | Send upcoming bill reminders                                                                                              |
| ANY    | `/api/cron/monthly-reports` | Generate pre-aggregated monthly reports                                                                                   |
| ANY    | `/api/cron/gdpr-cleanup`    | Pseudonymize accounts past the 30-day grace period, redact Stripe customers, purge `security_events` older than 12 months |

---

## Error Codes

| Code | Meaning                                                                               |
| ---- | ------------------------------------------------------------------------------------- |
| 400  | Bad request / Zod validation failed                                                   |
| 401  | Missing or expired JWT                                                                |
| 403  | Authenticated but not authorized (wrong house/role, `ACCOUNT_PENDING_DELETION`)       |
| 404  | Resource not found                                                                    |
| 409  | Conflict (e.g. duplicate email, `OWNER_MUST_TRANSFER`, `SUBSCRIPTION_ALREADY_ACTIVE`) |
| 500  | Unexpected server error                                                               |
