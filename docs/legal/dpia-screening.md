# DPIA Screening (Art. 35)

Status: DRAFT 2026-10-26 · Assessed after the Wave 1 decisions: B1 (birthplace, nationality, birthdate, smoking habit removed), B4 (`comments` table dropped).

## Conclusion

**A DPIA is not required.** No processing meets two or more EDPB/WP248 criteria in a way that is likely to result in a high risk, and nothing on the Garante list (Provv. 467 of 11 Oct 2018) applies. Revisit when any trigger in section 4 occurs.

## 1. EDPB / WP248 criteria

| #   | Criterion                                      | Applies?   | Note                                                                                                                                                              |
| --- | ---------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Evaluation or scoring (profiling)              | No         | `comments` ratings dropped; no scoring, no compatibility matching                                                                                                 |
| 2   | Automated decision with legal effect           | No         |                                                                                                                                                                   |
| 3   | Systematic monitoring                          | No         | Security events are limited and not monitoring of behaviour                                                                                                       |
| 4   | Sensitive data or highly personal data         | No         | Art. 9 data removed (smoking habit, nationality). Financial data between housemates is not "highly personal" in the Art. 9/10 sense, but is private: kept in view |
| 5   | Large-scale processing                         | No         | Micro-enterprise, small user base (TODO re-check numbers)                                                                                                         |
| 6   | Matching or combining datasets                 | No         |                                                                                                                                                                   |
| 7   | Vulnerable data subjects                       | Borderline | Minors 14-17 may use the free plan; no profiling, no marketing. Paid plans 18+                                                                                    |
| 8   | Innovative technology                          | No         | Standard web stack                                                                                                                                                |
| 9   | Prevents exercising a right or using a service | No         |                                                                                                                                                                   |

Count: 0 clear, 1 borderline. Threshold is 2.

## 2. Garante list (Provv. 467/2018), items checked

Evaluative/scoring processing at large scale; automated decisions; systematic monitoring; special-category data at large scale; biometric/genetic; location tracking; IoT; employee monitoring; large-scale profiling for marketing; credit/insolvency databases; whistleblowing; connected-device profiling. **None applies.**

## 3. Risk notes handled without a DPIA

- Housemates see each other's name/avatar and optional profile only with consent; DTO limits fields (B2).
- Financial data limited to members of the same house (`project_id` scoping).
- Erasure covers notes, reports, memberships and Stripe customer data.

## 4. Triggers to redo this screening (and likely run a DPIA)

- Reintroducing smoking habit, health, nationality/ethnic data, or any Art. 9 field.
- Reintroducing ratings or reviews of people, or any matching / compatibility scoring.
- Analytics or tracking beyond technical cookies; advertising; profiling.
- Large-scale growth (order of tens of thousands of active users, TODO threshold) or a B2B/agency offering.
- Location data, biometrics, ID documents or Codice Fiscale collection.
- Uploads of documents or photos of other persons (F5 gate), AI features processing user content.
- Services aimed mainly at minors.

Assessor: TODO · Date: TODO · Approved by: TODO

_Draft generated from the project's data mapping. Not legal advice. Requires review by the data controller and legal counsel before publication._
