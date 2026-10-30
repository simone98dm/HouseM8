export interface Subscription {
  plan: 'free' | 'pro' | 'house_plus';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  billing_period: 'monthly' | 'annual' | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
}
