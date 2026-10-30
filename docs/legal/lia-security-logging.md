# Legitimate Interest Assessment: security events and rate limiter

Status: DRAFT 2026-10-26 · Covers `security_events` (user_id, event, hashed IP, created_at, 12 months) and `rate_limits` (hashed IP / email hash, 2 hours). Related findings: F2, F3. Basis: Art. 6(1)(f); Recital 49 (network and information security).

## 1. Purpose test

- Interest: protect accounts and financial data against brute force, credential stuffing and abuse; detect, scope and report personal data breaches within 72 h (Arts. 32-33); prove who changed roles or ownership and who exported data.
- Legitimate: yes (explicitly recognised by Recital 49; also supports legal duties under Arts. 32-33). Interest is the controller's and the users'.

## 2. Necessity test

| Question                                  | Answer                                                                                                                                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is the processing needed for the purpose? | Yes. Without an audit trail a breach cannot be scoped; without rate limiting, sign-in endpoints are open to brute force. Vercel logs last about 1 hour, so they are not enough                                               |
| Less intrusive alternative?               | Already applied: only event type, timestamp, user id and a **hashed IP** (keyed hash, not reversible to a raw IP); no user agent, no payload, no raw IP, no email in plaintext. Rate-limit keys are hashed, retained 2 hours |
| Events logged                             | `signin_success`, `signin_failed`, `signout` (optional), password reset requested/used, export requested, deletion requested/cancelled, role changed, ownership transferred, consent changes                                 |

## 3. Balancing test

| Factor                  | Assessment                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nature of data          | Low sensitivity: technical identifiers; no content, no special categories                                                                                                                |
| Reasonable expectations | Users of an online service with accounts expect basic security logging; it is disclosed in the privacy policy                                                                            |
| Impact on data subjects | Low: data is not used for profiling, marketing, or performance monitoring of people; access limited to controller for incident handling                                                  |
| Safeguards              | Hashing (IP), 12-month automatic purge, no sharing with third parties other than hosting processors, access restricted to admins, never used for employee-style monitoring               |
| Right to object         | Art. 21 applies; an objection is evaluated case by case, but compelling security grounds will usually prevail for the minimum event set. Reply template in `rights-request-procedure.md` |

## 4. Retention rationale

- 12 months: long enough to detect slow-burn compromises and to investigate incidents reported late; shorter than the limitation periods. TODO confirm with counsel; `rate_limits`: 2 h (window of the limiter).
- Events of a deleted user: `user_id` pseudonymised with the account; events deleted at the 12-month purge.

## 5. Conclusion

Legitimate interest is a proper basis. Result: **proceed** with the safeguards above. Review yearly or when new events/fields are added (update `art30-record.md` and the policy).

Assessor: TODO · Date: TODO · Approved by: TODO

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
