import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const repos = getRepositories();

  const { data: subscription, error } = await repos.subscriptions.getByUserId(
    user.id,
  );

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error });
  }

  return {
    data: subscription ?? {
      plan: 'free',
      status: 'active',
      billing_period: null,
      trial_ends_at: null,
      current_period_end: null,
    },
  };
});
