import { getAuthProvider } from '~~/server/providers/auth/factory';
import { z } from 'zod';
import { logSecurityEvent } from '~~/server/utils/security-events';

const signinSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export default defineEventHandler(async (event) => {
  const { email, password, rememberMe } = await readValidatedBody(
    event,
    signinSchema.parse,
  );

  try {
    const authProvider = getAuthProvider();

    // Use event-based sign in (handles cookies/JWT for all providers)
    if (authProvider.signInWithEvent) {
      const user = await authProvider.signInWithEvent(event, {
        email,
        password,
        rememberMe,
      });

      if (!user) {
        await logSecurityEvent('signin_failed', { event });
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid email or password',
        });
      }

      await logSecurityEvent('signin_success', { userId: user.id, event });
      return { user };
    }

    // Fallback to regular sign in if signInWithEvent not implemented
    const user = await authProvider.signIn({ email, password });

    if (!user) {
      await logSecurityEvent('signin_failed', { event });
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password',
      });
    }

    await logSecurityEvent('signin_success', { userId: user.id, event });
    return { user };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    // Handle unverified email specifically
    if (error instanceof Error && error.message === 'EMAIL_NOT_CONFIRMED') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Please verify your email address before signing in.',
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Sign in failed',
    });
  }
});
