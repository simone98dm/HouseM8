import { z } from 'zod';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { getAuthProvider } from '~~/server/providers/auth/factory';

const schema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export default defineEventHandler(async (event) => {
  const { token, newPassword } = await readValidatedBody(event, schema.parse);

  try {
    const authProvider = getAuthProvider();
    const success = await authProvider.resetPassword(token, newPassword);

    if (!success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired reset token',
      });
    }

    // The provider does not return the user id; the event carries the IP only.
    await logSecurityEvent('password_reset', { event });

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to reset password',
    });
  }
});
