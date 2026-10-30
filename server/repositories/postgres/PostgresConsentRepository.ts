import { toSafeErrorMessage } from './utils';
import type { Pool } from 'pg';
import type {
  IConsentRepository,
  UserConsent,
} from '../interfaces/IConsentRepository';
import type { RepositoryResponse } from '../interfaces/IBaseRepository';
import type { ConsentPurpose } from '~~/shared/utils/legal';

/**
 * Optional profile columns that exist only while profile_sharing is granted.
 * avatar_url is NOT here: it is part of the basic account (name + avatar).
 */
export const PROFILE_SHARING_COLUMNS = [
  'gender',
  'bio',
  'occupation_type',
  'study_field',
  'job_title',
  'languages',
  'pets',
  'telephone',
  'instagram',
  'twitter',
  'tiktok',
  'linkedin',
  'profile_pictures',
] as const;

const CLEAR_PROFILE_SQL = `UPDATE users SET ${PROFILE_SHARING_COLUMNS.map(
  (c) => `${c} = NULL`,
).join(', ')} WHERE id = $1`;

export class PostgresConsentRepository implements IConsentRepository {
  constructor(private readonly pool: Pool) {}

  async listActive(userId: string): Promise<RepositoryResponse<UserConsent[]>> {
    try {
      const result = await this.pool.query<UserConsent>(
        `SELECT id, user_id, purpose, version, granted_at, withdrawn_at
           FROM user_consents
          WHERE user_id = $1 AND withdrawn_at IS NULL
          ORDER BY granted_at`,
        [userId],
      );
      return { data: result.rows, error: null };
    } catch (err) {
      return { data: null, error: toSafeErrorMessage(err) };
    }
  }

  async grant(
    userId: string,
    purpose: ConsentPurpose,
    version: number,
  ): Promise<RepositoryResponse<UserConsent>> {
    try {
      // The partial unique index makes the insert a no-op when already active.
      await this.pool.query(
        `INSERT INTO user_consents (user_id, purpose, version)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, purpose) WHERE withdrawn_at IS NULL DO NOTHING`,
        [userId, purpose, version],
      );
      const result = await this.pool.query<UserConsent>(
        `SELECT id, user_id, purpose, version, granted_at, withdrawn_at
           FROM user_consents
          WHERE user_id = $1 AND purpose = $2 AND withdrawn_at IS NULL`,
        [userId, purpose],
      );
      return { data: result.rows[0] ?? null, error: null };
    } catch (err) {
      return { data: null, error: toSafeErrorMessage(err) };
    }
  }

  async recordWaiver(
    userId: string,
    version: number,
  ): Promise<RepositoryResponse<void>> {
    let client;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      await client.query(
        `UPDATE user_consents SET withdrawn_at = NOW()
          WHERE user_id = $1 AND purpose = 'withdrawal_waiver' AND withdrawn_at IS NULL`,
        [userId],
      );
      await client.query(
        `INSERT INTO user_consents (user_id, purpose, version)
         VALUES ($1, 'withdrawal_waiver', $2)`,
        [userId, version],
      );
      await client.query('COMMIT');
      return { data: undefined, error: null };
    } catch (err) {
      await client?.query('ROLLBACK').catch(() => undefined);
      return { data: null, error: toSafeErrorMessage(err) };
    } finally {
      client?.release();
    }
  }

  async withdraw(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<RepositoryResponse<void>> {
    let client;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      await client.query(
        `UPDATE user_consents SET withdrawn_at = NOW()
          WHERE user_id = $1 AND purpose = $2 AND withdrawn_at IS NULL`,
        [userId, purpose],
      );
      if (purpose === 'profile_sharing') {
        await client.query(CLEAR_PROFILE_SQL, [userId]);
      }
      await client.query('COMMIT');
      return { data: undefined, error: null };
    } catch (err) {
      await client?.query('ROLLBACK').catch(() => undefined);
      return { data: null, error: toSafeErrorMessage(err) };
    } finally {
      client?.release();
    }
  }
}
