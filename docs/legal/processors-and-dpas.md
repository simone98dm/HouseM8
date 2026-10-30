# Processors, DPAs and Transfers (Art. 28, Chapter V)

Status: DRAFT. Check the box only when the signed/accepted DPA is archived in the company document store (TODO location). Links are the providers' public DPA pages as known at drafting; verify they are current.

| Processor                          | Role                                                                                                | Data                                              | Location                                             | Transfer tool                             | SCC module                                                 | TIA                 | DPA status                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| Vercel Inc. (US)                   | Processor: hosting, functions, logs                                                                 | all request data, IPs                             | fra1/dub1 (EU) + global CDN                          | DPF (verify certification) + SCC fallback | Module 2 (C2P)                                             | No (EU region, DPF) | [ ] https://vercel.com/legal/dpa                      |
| Supabase Pte. Ltd. (SG)            | Processor: Postgres, backups                                                                        | all database content                              | AWS eu-central-1 (Frankfurt); processor in Singapore | SCC (no adequacy for SG)                  | Module 3 (P2P) with AWS as sub-processor, Module 2 with us | **Yes**             | [ ] https://supabase.com/legal/dpa                    |
| Resend / Plus Five Five Inc. (US)  | Processor: transactional email                                                                      | recipient email, name, email content              | US                                                   | DPF (verify) + SCC                        | Module 2                                                   | **Yes**             | [ ] https://resend.com/legal/dpa                      |
| Stripe Payments Europe Ltd. (IE)   | Processor for subscription processing; **independent controller** for fraud, AML, regulatory duties | email, name, address, VAT id, card data, invoices | EU/US                                                | DPF + SCC (Stripe group)                  | Module 2 (processor part)                                  | No (EU entity, DPF) | [ ] https://stripe.com/legal/dpa                      |
| Google Ireland Ltd.                | Independent controller of the Google account; we receive `openid email profile`                     | email, name, picture, Google id                   | EU/US                                                | DPF                                       | n/a (controller to controller)                             | No                  | [ ] n/a: reference Google's terms, disclose in policy |
| GitHub Packages                    | Build tool only, no user data                                                                       | none                                              | n/a                                                  | n/a                                       | n/a                                                        | n/a                 | n/a                                                   |
| SDI / e-invoicing provider         | Processor                                                                                           | invoice data                                      | TODO                                                 | TODO                                      | TODO                                                       | TODO                | [ ] TODO                                              |
| Mailbox provider (privacy mailbox) | Processor                                                                                           | requests, correspondence                          | TODO                                                 | TODO                                      | TODO                                                       | TODO                | [ ] TODO                                              |

## Per-processor to-do

- [ ] Sign/accept and archive each DPA (PDF with date).
- [ ] Archive the SCC annex (module, parties, annex I-III) for Vercel, Supabase, Resend, Stripe.
- [ ] Confirm the sub-processor list of each provider and subscribe to change notices.
- [ ] Confirm DPF certification status of Vercel, Resend, Stripe, Google (dataprivacyframework.gov) and record the check date: TODO.
- [ ] Keep this table in sync with the privacy policy (see `release-legal-checklist.md`).

## TIA outline (Supabase SG, Resend US)

One page per transfer, using the EDPB Recommendations 01/2020 steps.

1. **Describe the transfer**: data categories, volume, frequency, onward transfers.
   - Supabase: all database content, stored in eu-central-1; Singapore access only for support/ops by Supabase staff. Risk is remote access, not storage.
   - Resend: recipient email, name, message body (verification links, reminders), sent from the US.
2. **Transfer tool**: SCC (Supabase), DPF + SCC (Resend).
3. **Assess the third country law**: Singapore (PDPA, government access powers, no EU adequacy); US (FISA 702, EO 14086 safeguards, DPF adequacy decision of July 2023 as supporting evidence). Note the data importers' publicly stated transparency reports and government-request policies.
4. **Supplementary measures**:
   - Supabase: EU storage region, encryption at rest, minimal data (no Art. 9 data after B1), credentials in env vars only, access limited to service role from Vercel.
   - Resend: send no sensitive content (no balances in the email body beyond what the reminder needs), links with short-lived tokens, anonymised recipients never sent.
5. **Procedural steps**: DPA/SCC signed, contractual notification of government requests.
6. **Conclusion and re-evaluation**: TODO outcome (expected: acceptable given low-sensitivity data and supplementary measures); re-evaluate yearly or on legal change (e.g. DPF invalidation).

Record: assessor TODO, date TODO, approver TODO.

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
