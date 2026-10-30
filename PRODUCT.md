# Product

## Register

product

## Platform

web

## Users

People sharing a home in Europe and North America, roughly early twenties to mid thirties, using the app on a phone in ordinary domestic moments — standing in a kitchen after a shop, checking a bill before rent day, settling up on the way home.

Six recurring shapes. The first three are drawn from `marketing/brand-guidelines.md`:

- **The organised flatmate** keeps the shared spreadsheet alive because nobody else will. Her job is to stop being the unpaid accountant of the flat.
- **The reluctant admin** has his name on the utility contracts and would rather absorb the cost than ask a friend for money. His job is to get repaid without having the conversation.
- **The new renter** just left managed student housing and is anxious about paying too much or missing a bill she never knew existed. Her job is to know exactly what she owes and when.

Three more, added with the Lived-in Ledger direction (2026-10-28), who are not technical and will not learn a ledger:

- **The non-technical housemate** just wants to know "who do I give money to", and forgets to settle. Often the other person marks the payment as received. Her job is to see one name, one amount and one button.
- **The forgetful young housemate** mostly logs expenses and checks "how much this month". His job is to add a cost in a few seconds and see his own share without reading a table.
- **The house owner / landlord** checks that everything is in order, logs big one-off costs (energy) as expenses, and adds or removes people as contracts change. His job is to keep the house record correct.

All six share one job to be done: know the true state of house money without maintaining it by hand.

## Product Purpose

House M8 is the shared ledger for a household. It logs shared expenses and splits them, tracks recurring bills and their due dates, computes each person's net balance, and reduces the debts to a minimal settlement plan. Around that core it carries houses with owner/member roles and invite links, a bulletin board, member reports, PDF exports, profile and GDPR controls, and Stripe subscriptions.

It exists because the alternative — a spreadsheet plus WhatsApp reminders — puts the cost of fairness on one person and turns money into a relationship problem.

Success is a house where nobody chases anyone: the balance is current without anyone updating it, reminders arrive before a due date rather than after, and a housemate can answer "what do I owe?" in one glance.

## Positioning

The only shared-living app where fairness happens by default, not by someone's effort: the balance is always current, always visible, and nobody has to chase anyone.

## Brand Personality

Transparent, reliable, quietly smart. Every balance and split shows its breakdown one tap away; the product does what it said it would, when it said it would; the intelligence sits in smart defaults and automatic calculation, never in the description.

Voice is clear and direct, warm but efficient, confident without hedging, and lightly witty — a competent housemate, not a bank and not a children's app. Warmth comes from clarity, not from emoji.

Emotionally the interface should produce **calm** and **control**: relief for the person who was carrying the ledger, and confidence for the person who was afraid of getting it wrong. It should never produce guilt or social pressure.

## Anti-references

- **Infantile or emoji-heavy apps.** No mascots, no forced slang, no exclamation marks manufacturing excitement, no cheerleading an ordinary action. This is money between friends; playfulness that undercuts trust is worse than plainness.
- **Generic SaaS template.** No gradient hero, no cream/sand body background, no repeated icon-and-heading card grids, no tiny uppercase tracked eyebrow above every section. If the layout could belong to any B2B product, it belongs to none.

## Design Principles

1. **Name the number, the person, the date.** Never "you have outstanding balances" — "€47 to Marco, before Friday." Specificity respects the user's time and treats them as an adult.
2. **Make the invisible legible.** The chasing labour disappears because the state is continuously visible to everyone, not because someone sent a better reminder.
3. **Warmth through clarity first; decoration only when it orients (category, page identity), never behind data.** An ordinary action gets an ordinary acknowledgement. Clarity is the friendliness.
4. **Calm under money stress.** Errors give a probable cause and two next steps. No blame, no jokes in failure states, no excessive apology.
5. **Quiet intelligence.** Smart defaults and automatic calculation do the work silently. Lead with the outcome, never the mechanism.

## Accessibility & Inclusion

WCAG 2.2 AA across every screen. Body text at 4.5:1 minimum against its surface (placeholders included), large text at 3:1, visible focus states on every interactive element, form inputs with real associated labels rather than placeholder-only, and full keyboard navigability.

Dark mode is first-class and class-based, so contrast must hold in both themes. Every animation needs a `prefers-reduced-motion` alternative. All user-facing strings, including `aria-label` and `alt` text, resolve through i18n in both English and Italian.
