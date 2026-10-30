# Data-Subject Rights Request Procedure (Arts. 12, 15-22)

Status: DRAFT 2026-10-26 · Mailbox: TODO privacy mailbox · Owner: TODO.

## 1. Intake

- Channels: in-app (export, delete account, Settings > Privacy) and email to the privacy mailbox. Any clear wording counts as a request, no form required.
- Within 1 working day: log the request in `gdpr_requests` (type `access | export | rectification | erasure | restriction | objection | portability`, status `pending`) and note the received date. For email requests, insert the row manually (admin SQL / script, TODO owner).
- **Deadline: 1 month from receipt**, extendable by **2 more months** for complexity or volume (Art. 12(3)); tell the person within the first month with reasons. Internal SLA: reply within 30 days. Free of charge unless manifestly unfounded or excessive.

## 2. Identity verification

- In-app requests from a signed-in session: already authenticated, no extra check (for erasure the UI asks for confirmation).
- Email requests: reply only to the **registered account email**. If the sender uses another address, ask to send the request from the registered one or to confirm via a link in-app. Do not request ID documents unless reasonable doubts remain; if so, ask the minimum and delete the copy after the check.
- Third-party/representative requests: written authorisation + their ID, TODO counsel.
- Never disclose whether an address has an account to unverified senders.

## 3. Handling by right

| Right                    | Action                                                                                                                                                                                                                                                                                                                                                                                           | Notes                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access (15)              | Provide the JSON export (`GET /api/gdpr/export`, covers all user-keyed tables) + the Art. 15 information (purposes, recipients, retention, rights, source) via the privacy policy and reply                                                                                                                                                                                                      | Exports are logged as `export` rows. Exclude other persons' data (housemates' details beyond what the user already sees)                                                                                                                            |
| Rectification (16)       | In-app profile edit; email requests: fix on the user's behalf after verification                                                                                                                                                                                                                                                                                                                 |                                                                                                                                                                                                                                                     |
| Erasure (17)             | In-app "Delete account": 30-day grace, then pseudonymisation; subscription cancelled at period end; Stripe customer data redacted                                                                                                                                                                                                                                                                | Owner of a house with other active members must transfer ownership first (`OWNER_MUST_TRANSFER`). Retained: invoices 10 years (Art. 17(3)(b)), pseudonymised shared financial rows, security events until purge. Tell the user what is kept and why |
| Restriction (18)         | **By email.** Cases: accuracy contested, unlawful processing but user opposes erasure, needed for legal claims, pending objection. Action: set a restriction flag / admin note and suspend non-storage processing (reminders, sharing of optional profile) until resolved, TODO technical mechanism (manual: clear optional fields' visibility via consent withdrawal + disable reminder emails) | Notify the user before lifting the restriction                                                                                                                                                                                                      |
| Objection (21)           | **By email.** Processing on legitimate interest (security events, invitations): assess grounds; stop if no compelling grounds. Note: objection to technical security logging is usually rejected with reasons. No direct marketing exists                                                                                                                                                        | Reply with outcome and complaint right                                                                                                                                                                                                              |
| Portability (20)         | Same JSON export; applies to data provided by the user under contract/consent                                                                                                                                                                                                                                                                                                                    | Direct transmission to another controller: only if technically feasible, TODO                                                                                                                                                                       |
| Withdraw consent (7(3))  | In-app toggle (profile sharing) clears optional fields; withdrawal waiver is not a consent withdrawal but a contract matter                                                                                                                                                                                                                                                                      | Logged in `user_consents`                                                                                                                                                                                                                           |
| Automated decisions (22) | None exist; state so                                                                                                                                                                                                                                                                                                                                                                             |                                                                                                                                                                                                                                                     |

Backups: erased data may persist in backups until they roll off (state retention in the reply once backups exist, F1).

## 4. Closing and logging

- Update `gdpr_requests` status (`completed | rejected | partially_completed`), completion date, note on what was done / refused and why.
- Retain the entry and correspondence 12 months after closure, then delete.
- Refusals must state the reason, and the right to complain to the Garante and to seek a judicial remedy.
- Pattern of the same request: escalate to TODO privacy contact.

## 5. Reply templates

**Acknowledgement (IT)**

> Oggetto: Abbiamo ricevuto la tua richiesta (rif. {{id}})
> Ciao {{nome}}, abbiamo ricevuto il {{data}} la tua richiesta di {{diritto}}. Ti risponderemo entro un mese dal ricevimento, cioè entro il {{scadenza}}. Se necessario potremo chiederti conferma della tua identità. {{Il titolare}}

**Acknowledgement (EN)**

> Subject: We received your request (ref. {{id}})
> Hi {{name}}, we received your {{right}} request on {{date}}. We will reply within one month of receipt, by {{deadline}}. We may ask you to confirm your identity. {{Controller}}

**Completed (IT)**

> Oggetto: Esito della tua richiesta (rif. {{id}})
> Ciao {{nome}}, la tua richiesta di {{diritto}} è stata {{evasa / evasa in parte}}. {{Dettaglio: cosa abbiamo fatto, allegato export, dati conservati per obbligo di legge e relativa durata}}. Puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it) o adire l'autorità giudiziaria. {{Titolare, contatti}}

**Completed (EN)**

> Subject: Outcome of your request (ref. {{id}})
> Hi {{name}}, your {{right}} request has been {{fulfilled / partly fulfilled}}. {{Details: what we did, attached export, data kept by legal obligation and for how long}}. You may lodge a complaint with the Italian data protection authority (Garante, www.garanteprivacy.it) or seek a judicial remedy. {{Controller, contacts}}

**Extension (IT)**

> Ciao {{nome}}, per la complessità della richiesta (rif. {{id}}) ci serve più tempo: la risposta arriverà entro il {{nuova data, max 3 mesi dal ricevimento}}. Motivo: {{motivo}}.

**Extension (EN)**

> Hi {{name}}, because of the complexity of your request (ref. {{id}}) we need more time: you will receive our reply by {{new date, max 3 months from receipt}}. Reason: {{reason}}.

**Refusal / identity needed (IT)**

> Ciao {{nome}}, non possiamo dare seguito alla richiesta (rif. {{id}}) perché {{motivo / non riusciamo a verificare la tua identità: scrivici dall'indirizzo email registrato}}. Puoi proporre reclamo al Garante (www.garanteprivacy.it) o ricorrere all'autorità giudiziaria.

**Refusal / identity needed (EN)**

> Hi {{name}}, we cannot act on your request (ref. {{id}}) because {{reason / we cannot verify your identity: please write from your registered email}}. You may complain to the Garante (www.garanteprivacy.it) or seek a judicial remedy.

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
