# Release Legal Checklist (finding D4)

Status: DRAFT 2026-10-26 · Use on every PR/release that touches data or providers. Also referenced from `CLAUDE.md` (rule added by guidelines-agent).

## Triggers: does the change involve any of these?

- [ ] A **new processor or sub-processor** (new SaaS, SDK, API, CDN, storage, AI service).
- [ ] A **new personal-data field**, table, cookie, localStorage key or log field.
- [ ] A **new purpose** for existing data (e.g. analytics, marketing, matching, notifications).
- [ ] A **retention change** (new cron, longer/shorter period, backups enabled, uploads enabled).
- [ ] A **new transfer** outside the EU or a changed hosting region.
- [ ] A change to **pricing, trial, renewal, withdrawal** terms, or the minimum age.
- [ ] Controller identity change (name, address, P.IVA, mailbox).

If **none**: tick "no legal impact" in the PR description and stop.

## If any trigger is ticked

1. [ ] Update `docs/legal/art30-record.md` (activity row: purpose, data, basis, recipients, transfers, retention).
2. [ ] New processor: add to `processors-and-dpas.md`, sign/archive DPA, SCC/TIA if non-EU.
3. [ ] Update the policies in the app: `privacy.vue` (processors, purposes, retention, bases), `terms.vue` (commercial changes), `cookies.vue` + `app/utils/legal/cookies.ts` (storage items) in **both IT and EN**.
4. [ ] **Bump `LEGAL_POLICY_VERSION`** (integer in `shared/utils/legal.ts`) when the change is material to users. This triggers re-acceptance (`ConsentVersionModal`). Typo/clarification fixes: no bump. Record the new version and date in the table below.
5. [ ] New field/purpose: legal basis decided. Consent basis means an unticked checkbox + `user_consents` row + withdrawal path. Special categories (Art. 9): stop, redo `dpia-screening.md`.
6. [ ] Rights coverage: export (`exportUserData`), erasure (`pseudonymize_user()` / cleanup), and `rights-request-procedure.md` handle the new data.
7. [ ] Security events / logging: nothing personal in plaintext logs; add events to `security_events` if relevant; update `lia-security-logging.md` if scope grows.
8. [ ] DPIA screening re-run if any trigger in `dpia-screening.md` section 4 applies.
9. [ ] Tracking or third-party scripts: need a Garante-compliant banner (Provv. 231/2021) before merge. Default: not allowed.
10. [ ] Notify users where required (email for material changes, in addition to the re-acceptance modal) and note the change date in the policies.

## Version log

| `LEGAL_POLICY_VERSION` | Date           | Change                                                                                                    | Approved by |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| 1                      | pre-2026-10-26 | Initial policy (string `'1.0'`)                                                                           | n/a         |
| 2                      | TODO           | v2 texts: Stripe, billing, dropped fields, consent, grace period, security events, minimum age, B2C Terms | TODO        |

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
