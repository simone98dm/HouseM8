-- Migration: referral_rewards table
-- Records pending and redeemed referral rewards

CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    invitation_id UUID REFERENCES house_invitations(id) ON DELETE SET NULL,
    reward_type TEXT CHECK (reward_type IN ('pro_month')) DEFAULT 'pro_month' NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_id ON referral_rewards(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_redeemed ON referral_rewards(redeemed_at) WHERE redeemed_at IS NULL;
