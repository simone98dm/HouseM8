import type { Plan } from '../repositories/interfaces/ISubscriptionRepository';
import { getRepositories } from '../repositories/factory';

export const PLAN_LIMITS = {
  free: { maxHouses: 1, historyMonths: 3 },
  pro: { maxHouses: 3, historyMonths: Infinity },
  house_plus: { maxHouses: Infinity, historyMonths: Infinity },
} as const;

export async function getUserPlan(userId: string): Promise<Plan> {
  const repos = getRepositories();
  const { data: sub } = await repos.subscriptions.getByUserId(userId);
  // past_due, incomplete, unpaid, paused, ... do not keep paid features.
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing'))
    return 'free';
  return sub.plan;
}

export async function requirePlan(
  userId: string,
  requiredPlan: 'pro' | 'house_plus',
): Promise<void> {
  const plan = await getUserPlan(userId);
  const planRank: Record<Plan, number> = { free: 0, pro: 1, house_plus: 2 };
  if (planRank[plan] < planRank[requiredPlan]) {
    throw createError({
      statusCode: 403,
      statusMessage: `This feature requires the ${requiredPlan === 'pro' ? 'Pro' : 'House+'} plan`,
    });
  }
}
