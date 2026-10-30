import { z } from 'zod';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { sendConfirmationLink } from '~~/server/utils/confirmation-link';

const resendSchema = z.object({
  // Same shape as sign-up (no case folding), so the lookup matches the row.
  email: z.string().trim().email().max(254),
});

/**
 * POST /api/auth/resend-confirmation
 *
 * Body: { email }. Mails a fresh sign-up link to an account that never
 * confirmed. Consent was recorded at sign-up, so it is not asked again.
 * The provider's lookup skips accounts issued a link in the last 15 minutes
 * (per-inbox cap); the rate-limit middleware caps requests per IP. The
 * response is identical for every address (anti-enumeration).
 */
export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, resendSchema.parse);

  const unconfirmed = await getAuthProvider().getUnconfirmedUserByEmail(email);
  if (unconfirmed) event.waitUntil(sendConfirmationLink(unconfirmed.id, email));

  return { success: true };
});
