import { consola } from 'consola';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { sendRegistrationEmail } from '~~/server/emails';

/**
 * Mints a sign-up verification token and mails the confirmation link.
 * Never rejects: callers hand it to `event.waitUntil` instead of awaiting it,
 * so the response takes the same time whether or not a link was sent
 * (anti-enumeration, including timing).
 */
export async function sendConfirmationLink(
  userId: string,
  email: string,
): Promise<void> {
  try {
    const verificationToken =
      await getAuthProvider().createEmailVerificationToken(userId, email);
    if (!verificationToken) return;
    const baseUrl =
      useRuntimeConfig().public.baseUrl || 'http://localhost:3000';
    await sendRegistrationEmail({
      email,
      userName: email,
      confirmationLink: `${baseUrl}/auth/confirm?token=${verificationToken.token}`,
    });
  } catch (error) {
    consola.error('Failed to send confirmation link:', error);
  }
}
