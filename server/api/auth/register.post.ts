import { getAuthProvider } from '~~/server/providers/auth/factory';
import { sendConfirmationLink } from '~~/server/utils/confirmation-link';
import { getRepositories } from '~~/server/repositories/factory';
import { isFeatureEnabled } from '~~/server/utils/feature-flags';
import { z } from 'zod';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  age_confirmed: z.literal(true, { message: 'You must confirm your age' }),
  terms_accepted: z.literal(true, { message: 'You must accept the terms' }),
  privacy_acknowledged: z.literal(true, {
    message: 'You must acknowledge the privacy policy',
  }),
});

// Generic success message (same for new and pre-existing emails — anti-enumeration)
const SUCCESS_MESSAGE =
  'If this email is new to us, a confirmation link is on its way. Please check your inbox.';

export default defineEventHandler(async (event) => {
  if (!(await isFeatureEnabled('showSignup'))) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const { email } = await readValidatedBody(event, (body) =>
    registerSchema.parse(body),
  );

  try {
    const authProvider = getAuthProvider();

    let user;
    try {
      user = await authProvider.signUpEmailOnly(email);
    } catch {
      user = null;
    }

    if (!user) {
      // Email already registered. If the account never confirmed, resend the
      // link so the sign-up isn't a dead end; a confirmed account gets nothing.
      // The response is identical either way (anti-enumeration).
      const unconfirmed = await authProvider.getUnconfirmedUserByEmail(email);
      if (unconfirmed)
        event.waitUntil(sendConfirmationLink(unconfirmed.id, email));
      return { success: true, message: SUCCESS_MESSAGE };
    }

    await getRepositories().users.update(user.id, {
      is_first_access: true,
      terms_accepted_at: new Date().toISOString(),
      consent_version: LEGAL_POLICY_VERSION,
    });

    await logSecurityEvent('signup', { userId: user.id, event });
    event.waitUntil(sendConfirmationLink(user.id, email));

    return { success: true, message: SUCCESS_MESSAGE };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Registration failed',
    });
  }
});
