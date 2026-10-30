import type { RepositoryResponse } from './IBaseRepository';

export const SECURITY_EVENTS = [
  'signin_success',
  'signin_failed',
  'signup',
  'password_reset',
  'password_set',
  'data_export',
  'deletion_requested',
  'deletion_cancelled',
  'account_pseudonymized',
  'role_changed',
  'ownership_transferred',
  'consent_granted',
  'consent_withdrawn',
  'subscription_withdrawn',
  'settlement_recorded',
  'settlement_undone',
  'share_paid',
  'share_unpaid',
] as const;

export type SecurityEventType = (typeof SECURITY_EVENTS)[number];

export interface SecurityEvent {
  id: string;
  user_id: string | null;
  event: SecurityEventType;
  ip_hash: string | null;
  created_at: string;
}

export interface ISecurityEventRepository {
  record(
    event: SecurityEventType,
    userId: string | null,
    ipHash: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<RepositoryResponse<null>>;
  listByUser(userId: string): Promise<RepositoryResponse<SecurityEvent[]>>;
  /** Returns the number of rows deleted. */
  purgeOlderThan(date: Date): Promise<RepositoryResponse<number>>;
}
