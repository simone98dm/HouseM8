import type { RepositoryResponse } from './IBaseRepository';
import type { ConsentPurpose } from '~~/shared/utils/legal';

export interface UserConsent {
  id: string;
  user_id: string;
  purpose: ConsentPurpose;
  version: number;
  granted_at: string;
  withdrawn_at: string | null;
}

export interface IConsentRepository {
  listActive(userId: string): Promise<RepositoryResponse<UserConsent[]>>;
  /** Idempotent: an already-active consent is returned unchanged. */
  grant(
    userId: string,
    purpose: ConsentPurpose,
    version: number,
  ): Promise<RepositoryResponse<UserConsent>>;
  /** Replaces any active waiver with a new one stamped now (one per purchase). */
  recordWaiver(
    userId: string,
    version: number,
  ): Promise<RepositoryResponse<void>>;
  /**
   * Withdraw the active consent. For `profile_sharing` the optional profile
   * columns on `users` are cleared in the same transaction.
   */
  withdraw(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<RepositoryResponse<void>>;
}
