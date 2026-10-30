import { assertStripeEnabled } from '~~/server/utils/stripe-guard';

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/stripe/')) return;
  await assertStripeEnabled();
});
