export type PersonId = string;
export type CurrencyCode = string;

/** Who benefits from an item, as fractions of its amount. Values must sum to 1. */
export type BeneficiaryFractions = Readonly<Record<PersonId, number>>;

export interface EntryItem {
  readonly title?: string;
  /** Amount in the entry's currency. */
  readonly amount: number;
  readonly beneficiaries: BeneficiaryFractions;
}

export type EntryKind = 'expense' | 'payment';

/**
 * An expense or a money transfer recorded in the group.
 *
 * A payment is modelled like an expense with one item whose only
 * beneficiary is the receiver: the sender is the `primaryPayer`.
 */
export interface Entry {
  readonly kind: EntryKind;
  readonly currencyCode: CurrencyCode;
  /** Pays whatever the secondary payers do not cover. */
  readonly primaryPayer: PersonId;
  /** Fixed amounts (entry currency) paid by people other than the primary payer. */
  readonly secondaryPayers?: Readonly<Record<PersonId, number>>;
  readonly items: readonly EntryItem[];
}

/**
 * Exchange rates: value of one unit of each currency expressed in a common
 * base currency (e.g. { USD: 1, EUR: 1.08, JPY: 0.0067 }).
 */
export type CurrencyRates = Readonly<Record<CurrencyCode, number>>;

export interface Group {
  readonly people: readonly PersonId[];
  readonly defaultCurrencyCode: CurrencyCode;
  readonly currencyRates: CurrencyRates;
  readonly entries: readonly Entry[];
}

/** Positive = the group owes this person; negative = this person owes the group. */
export type Balances = Readonly<Record<PersonId, number>>;

export interface SuggestedPayment {
  readonly from: PersonId;
  readonly to: PersonId;
  readonly amount: number;
  readonly currencyCode: CurrencyCode;
}
