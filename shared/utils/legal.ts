// Single source of truth for legal versioning. Bumping LEGAL_POLICY_VERSION
// makes every user with a lower users.consent_version re-accept the texts.
export const LEGAL_POLICY_VERSION = 2;
export const MIN_SIGNUP_AGE = 14;

export const CONSENT_PURPOSES = [
  'profile_sharing',
  'withdrawal_waiver',
] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];
