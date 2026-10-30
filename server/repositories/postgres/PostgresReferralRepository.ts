import { toSafeErrorMessage } from './utils';
import type { Pool } from 'pg';
import type {
  IReferralRepository,
  ReferralReward,
} from '../interfaces/IReferralRepository';
import type { RepositoryResponse } from '../interfaces/IBaseRepository';

export class PostgresReferralRepository implements IReferralRepository {
  constructor(private pool: Pool) {}

  async createReward(
    referrerId: string,
    referredId: string,
    invitationId: string | null,
  ): Promise<RepositoryResponse<ReferralReward>> {
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const result = await this.pool.query<ReferralReward>(
        `INSERT INTO referral_rewards (referrer_id, referred_id, invitation_id, reward_type, expires_at)
         VALUES ($1, $2, $3, 'pro_month', $4)
         ON CONFLICT (referrer_id, referred_id) DO NOTHING
         RETURNING *`,
        [referrerId, referredId, invitationId, expiresAt.toISOString()],
      );
      return { data: result.rows[0] ?? null, error: null };
    } catch (err) {
      return { data: null, error: toSafeErrorMessage(err) };
    }
  }

  async getPendingRewards(
    userId: string,
  ): Promise<RepositoryResponse<ReferralReward[]>> {
    try {
      const result = await this.pool.query<ReferralReward>(
        `SELECT * FROM referral_rewards
         WHERE referrer_id = $1 AND redeemed_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId],
      );
      return { data: result.rows, error: null };
    } catch (err) {
      return { data: null, error: toSafeErrorMessage(err) };
    }
  }

  async redeemReward(rewardId: string): Promise<RepositoryResponse<void>> {
    try {
      await this.pool.query(
        `UPDATE referral_rewards SET redeemed_at = NOW() WHERE id = $1`,
        [rewardId],
      );
      return { data: undefined, error: null };
    } catch (err) {
      return { data: null, error: toSafeErrorMessage(err) };
    }
  }

  async existsForPair(
    referrerId: string,
    referredId: string,
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT 1 FROM referral_rewards WHERE referrer_id = $1 AND referred_id = $2`,
        [referrerId, referredId],
      );
      return (result.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }
}
