import type { ConsentPurpose } from '~~/shared/utils/legal';

export type { ConsentPurpose };

export interface UserConsent {
  id: string;
  purpose: ConsentPurpose;
  version: number;
  granted_at: string;
  withdrawn_at: string | null;
}
