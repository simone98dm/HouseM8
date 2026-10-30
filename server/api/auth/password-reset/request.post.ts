import { z } from 'zod';
import { getAuthProvider } from '~~/server/providers/auth/factory';

const schema = z.object({
  email: z.string().email('Invalid email format'),
});

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, schema.parse);

  try {
    const authProvider = getAuthProvider();
    await authProvider.sendPasswordReset(email);

    // Always return success to prevent email enumeration
    return {
      success: true,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  } catch {
    // Still return success to prevent email enumeration
    return {
      success: true,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }
});
