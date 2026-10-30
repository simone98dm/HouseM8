# docs/legal: GDPR and EU compliance paperwork

DRAFTS generated 2026-10-26 from `docs/House-m8 — GDPR & EU Compliance Gap Analysis.md` and `.scratch/gdpr-compliance/PLAN.md`. They are engineering drafts, not legal advice.

| File | Purpose | Gap analysis ref |
| --- | --- | --- |
| `art30-record.md` | Record of processing activities | Org. item 1 |
| `processors-and-dpas.md` | Processors, DPA/SCC checklist, TIA outline | Org. item 2 |
| `lia-security-logging.md` | Legitimate interest assessment (security events, rate limiter) | F2, F3 |
| `dpia-screening.md` | DPIA screening (not required) | B1, B4 |
| `dpo-evaluation.md` | Why no DPO | Art. 37 |
| `breach-procedure.md` | Breach handling, Garante and user templates, register | Arts. 33-34 |
| `rights-request-procedure.md` | Rights requests, SLAs, reply templates | C5 |
| `accessibility-statement.md` | EAA statement draft (checkout) | Org. item 8 |
| `release-legal-checklist.md` | Keep policies in sync with releases | D4 |

## Pending (nothing here is complete until done)

- [ ] **Business details**: controller name, address, P.IVA, REA, PEC, privacy mailbox. Search for `TODO` in this folder and in `LEGAL_ENTITY`.
- [ ] **Signatures and archiving**: DPAs (Vercel, Supabase, Resend, Stripe, SDI provider, mailbox provider), SCC annexes, DPF checks.
- [ ] **Decisions** by the controller: legal bases, retention periods (all marked as proposals), TIA outcome, DPO decision, EAA exemption.
- [ ] **Operational**: backups (F1) then update the Art. 30 record and policy; breach roles and contacts; breach register location; restriction/objection technical mechanism.
- [ ] **Accessibility evaluation** results.
- [ ] **Lawyer review** of these documents, Privacy Policy, Terms and Cookie Policy (IT + EN).
- [ ] Review yearly, and on every trigger in `release-legal-checklist.md`.

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
