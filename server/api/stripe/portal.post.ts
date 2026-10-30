import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getStripeClient } from '~~/server/utils/stripe';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const repos = getRepositories();

  const { data: subscription } = await repos.subscriptions.getByUserId(user.id);

  if (!subscription?.stripe_customer_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No active subscription found',
    });
  }

  const stripe = getStripeClient();
  const appUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/settings/subscription`,
  });

  return { data: { url: session.url } };
});
