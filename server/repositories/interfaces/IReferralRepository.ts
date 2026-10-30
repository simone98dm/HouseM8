import type { RepositoryResponse } from './IBaseRepository';

export interface ReferralReward {
  id: string;
  referrer_id: string;
  referred_id: string;
  invitation_id: string | null;
  reward_type: 'pro_month';
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface IReferralRepository {
  createReward(
    referrerId: string,
    referredId: string,
    invitationId: string | null,
  ): Promise<RepositoryResponse<ReferralReward>>;
  getPendingRewards(
    userId: string,
  ): Promise<RepositoryResponse<ReferralReward[]>>;
  redeemReward(rewardId: string): Promise<RepositoryResponse<void>>;
  existsForPair(referrerId: string, referredId: string): Promise<boolean>;
}
