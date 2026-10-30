// Provider identity (imprint, art. 7 D.Lgs. 70/2003; art. 13 GDPR controller).
// Every TODO value must be replaced with real business data before the paid
// launch; the "draft pending legal review" banner stays until then.
export interface LegalEntity {
  name: string;
  legalForm: string;
  address: string;
  vatNumber: string;
  rea: string;
  pec: string;
  privacyEmail: string;
  supportEmail: string;
}

export const LEGAL_ENTITY: LegalEntity = {
  name: 'TODO: ragione sociale / legal name',
  legalForm: 'TODO: forma giuridica / legal form',
  address: 'TODO: sede legale / registered address',
  vatNumber: 'TODO: P.IVA',
  rea: 'TODO: REA (if registered)',
  pec: 'TODO: PEC',
  privacyEmail: 'TODO-privacy@housem8.app',
  supportEmail: 'TODO-support@housem8.app',
};

// Fail closed: imprint and mailboxes are shown only once every field is real.
export const isLegalEntityComplete = (
  entity: LegalEntity = LEGAL_ENTITY,
): boolean =>
  Object.values(entity).every((value) => !value.trim().startsWith('TODO'));
