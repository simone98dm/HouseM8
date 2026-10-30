# Personal Data Breach Procedure (Arts. 33-34 GDPR)

Status: DRAFT 2026-10-26. Applies to any event causing accidental or unlawful destruction, loss, alteration, unauthorised disclosure of or access to personal data (confidentiality, integrity, availability).

## 1. Roles

| Role                    | Who                                 | Duty                                                                 |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Incident lead           | TODO (controller / technical owner) | Decides, coordinates, signs the notification                         |
| Technical responder     | TODO                                | Contain, collect evidence, scope via `security_events`               |
| Legal / privacy contact | TODO (+ external counsel TODO)      | Risk assessment support, Garante and user communications             |
| Processors              | Vercel, Supabase, Resend, Stripe    | Must notify us "without undue delay" (DPA); we contact them for logs |

## 2. Detection and clock

Sources: provider alert, user report to the privacy mailbox, anomaly in `security_events` (spikes of `signin_failed`, unexpected `export_requested`, `role_changed`, `ownership_transferred`), leaked credentials, lost device.
The **72 h clock starts when we become "aware"** (reasonable certainty a breach happened). Record the awareness timestamp immediately. Processor awareness does not start our clock, but their notification to us does.

## 3. Steps

1. **Log** the event in the breach register (section 7) the same day, even if later judged not a breach.
2. **Contain**: revoke tokens / rotate secrets (`JWT` secrets, DB service key, Resend and Stripe keys), disable the affected endpoint, patch, restore from backup if integrity/availability is hit.
3. **Scope** using `security_events` (12-month retention) and provider logs:
   - Which user_ids, event types and hashed IPs in the time window? (`signin_success` after bursts of `signin_failed`, exports, role changes.)
   - Which tables/fields were reachable (account identity, optional profile, household finance, notes/reports, invitations, billing ids)? Card data is never on our side.
   - Number of data subjects and records; minors involved? Cross-border (other EU states)?
4. **Assess risk** to individuals (section 4).
5. **Decide**: notify Garante? notify users? document the reasoning either way (Art. 33(5)).
6. **Notify** within 72 h if there is a risk; if not complete, send a preliminary notification and supplement it later.
7. **Remediate and review**: root cause, fix, update the record, policy and this procedure.

## 4. Risk assessment (quick matrix)

| Question                        | Low                                      | High                                                                                                              |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Data type                       | Name/avatar only, hashed identifiers     | Email + password hash, financial balances with names, notes/reports content, telephone/social handles, Stripe ids |
| Readability                     | Encrypted / hashed with strong algorithm | Plaintext, or hashes crackable                                                                                    |
| Volume / ease of identification | One user, pseudonymous                   | Many users, directly identifiable                                                                                 |
| Vulnerable people (minors)      | None                                     | Minors affected                                                                                                   |
| Consequences                    | Negligible                               | Identity theft, fraud, harassment, financial loss                                                                 |

- **No risk** (e.g. lost encrypted data, availability blip restored from backup): record only, no notification.
- **Risk**: notify the Garante.
- **High risk**: also notify the data subjects (Art. 34), unless data was unintelligible (encrypted), subsequent measures remove the high risk, or it would take disproportionate effort (then public communication).

## 5. Garante notification template (72 h)

File through the Garante online procedure for personal data breach notification (garanteprivacy.it, "Notifica di una violazione dei dati personali"). Prepare these fields beforehand:

| Form section                            | Content                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type                                    | Preliminary / complete / supplement to a previous notification                                                                                         |
| Controller                              | TODO name, address, P.IVA, PEC, contact for the Garante (name, phone, email)                                                                           |
| DPO                                     | Not appointed                                                                                                                                          |
| Processors / joint controllers involved | e.g. Supabase, Vercel                                                                                                                                  |
| Dates                                   | Date/time of breach (or period), date/time of awareness, date of notification; if > 72 h, reason for the delay                                         |
| Where                                   | Systems/location affected (web app, database, hosting, email provider)                                                                                 |
| Nature                                  | Confidentiality / integrity / availability; cause (external attack, internal error, loss, bug, processor failure)                                      |
| Description                             | Short factual summary of what happened and how it was discovered                                                                                       |
| Data subjects                           | Categories (users, invited persons, minors?) and approximate number                                                                                    |
| Data                                    | Categories (identity, contact, optional profile, financial, content, billing ids) and approximate number of records; no special-category data expected |
| Likely consequences                     | Per risk matrix                                                                                                                                        |
| Measures taken / planned                | Containment, remediation, mitigation for data subjects                                                                                                 |
| Communication to data subjects          | Done / planned (date, channel) / not required (reason)                                                                                                 |
| Cross-border                            | Other EU member states involved?                                                                                                                       |
| Attachments                             | Evidence extract from `security_events`, provider statement                                                                                            |

## 6. User notification email (Art. 34)

**Italian**

> Oggetto: Comunicazione importante sulla sicurezza dei tuoi dati su House-m8
>
> Ciao {{first_name}},
>
> ti scriviamo perché il {{data}} abbiamo rilevato un incidente di sicurezza che ha riguardato i tuoi dati personali.
>
> **Cosa è successo:** {{descrizione breve}}
> **Quali dati sono coinvolti:** {{categorie di dati}}
> **Possibili conseguenze:** {{conseguenze, es. rischio di tentativi di phishing}}
> **Cosa abbiamo fatto:** {{misure adottate}}
> **Cosa puoi fare tu:** {{es. cambia la password, diffida di email sospette, controlla gli addebiti}}
>
> Per informazioni puoi scrivere a {{privacy mailbox}}. Il titolare del trattamento è {{TODO denominazione, indirizzo}}. Hai il diritto di presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
>
> Ci scusiamo per il disagio.
> Il team House-m8

**English**

> Subject: Important notice about the security of your House-m8 data
>
> Hi {{first_name}},
>
> We are writing because on {{date}} we detected a security incident affecting your personal data.
>
> **What happened:** {{short description}}
> **Data involved:** {{data categories}}
> **Possible consequences:** {{consequences, e.g. phishing risk}}
> **What we did:** {{measures taken}}
> **What you can do:** {{e.g. change your password, ignore suspicious emails, check your payments}}
>
> Questions: {{privacy mailbox}}. The controller is {{TODO name, address}}. You have the right to lodge a complaint with the Italian data protection authority (Garante, www.garanteprivacy.it) or your local supervisory authority.
>
> We apologise for the inconvenience.
> The House-m8 team

Send from the privacy mailbox, directly to each affected user (never to anonymised `@anon.local` addresses).

## 7. Internal breach register (Art. 33(5))

Keep in a restricted spreadsheet (TODO location). One row per event, **including non-notified ones**.

| ID     | Detected (UTC) | Aware (UTC) | Description | Cause | Data / subjects (n) | Risk level | Garante notified (date/ref or reason not) | Users notified (date or reason not) | Measures | Closed | Lessons / policy updates |
| ------ | -------------- | ----------- | ----------- | ----- | ------------------- | ---------- | ----------------------------------------- | ----------------------------------- | -------- | ------ | ------------------------ |
| BR-001 |                |             |             |       |                     |            |                                           |                                     |          |        |                          |

## 8. Preparedness

- [ ] Names and phones of the roles above filled in.
- [ ] Garante procedure account/credentials prepared (PEC for the controller).
- [ ] Test the scoping query on `security_events` once a year (tabletop exercise, 1 hour).
- [ ] Processor contact points for incidents collected (Vercel, Supabase, Resend, Stripe).

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
