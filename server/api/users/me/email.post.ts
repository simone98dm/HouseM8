import { z } from 'zod';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { getRepositories } from '~~/server/repositories/factory';
import { sendRegistrationEmail } from '~~/server/emails';
import { sendEmail } from '~~/server/utils/email';
import { escapeHtml } from '~~/server/templates/base';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';

/**
 * POST /api/users/me/email
 * Request an email change. Requires the current password; the user's email
 * only changes once the link sent to the NEW address is used
 * (GET/POST /auth/confirm → confirmEmailVerificationToken).
 */

const emailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email().max(255),
  currentPassword: z.string().min(1).max(1000),
});

// Same response whether or not the address is already taken (anti-enumeration)
const SUCCESS_MESSAGE =
  'If the address can be used, a confirmation link is on its way.';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { newEmail, currentPassword } = await readValidatedBody(
    event,
    emailChangeSchema.parse,
  );

  const authProvider = getAuthProvider();

  const passwordCheck = await authProvider.verifyPassword(
    user.id,
    currentPassword,
  );
  if (passwordCheck === 'no_password') {
    throw createError({
      statusCode: 400,
      message:
        'Set a password first (use password reset) before changing your email',
    });
  }
  if (passwordCheck !== 'valid') {
    throw createError({ statusCode: 403, message: 'Incorrect password' });
  }

  const { data: existing } = await getRepositories().users.getByEmail(newEmail);
  const isTaken = Boolean(existing) && existing?.id !== user.id;
  if (!isTaken && newEmail !== user.email.toLowerCase()) {
    const verificationToken = await authProvider.createEmailVerificationToken(
      user.id,
      newEmail,
    );
    if (verificationToken) {
      const baseUrl =
        useRuntimeConfig().public.baseUrl || 'http://localhost:3000';
      sendRegistrationEmail({
        email: newEmail,
        userName: newEmail,
        confirmationLink: `${baseUrl}/auth/confirm?token=${verificationToken.token}`,
      }).catch(() => {
        // Silent fail — email is best-effort
      });

      // The current address hears about it too, so an owner who did not ask
      // for this can react (a password reset voids the pending link).
      sendEmail({
        to: user.email,
        subject: 'House M8: email change requested',
        html: `<p>A request was made to change the email address of your House M8 account to <strong>${escapeHtml(newEmail)}</strong>.</p><p>Nothing changes until the link sent to that address is opened. If this was not you, reset your password now: that cancels the request and signs out every device.</p>`,
      }).catch(() => {
        // Silent fail — email is best-effort
      });
    }
  }

  return { success: true, message: SUCCESS_MESSAGE };
});
