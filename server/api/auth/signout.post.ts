import { getAuthProvider } from '~~/server/providers/auth/factory';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';

export default defineEventHandler(async (event) => {
  // Verify user is authenticated
  await verifyAuthCompat(event);

  try {
    const authProvider = getAuthProvider();
    await authProvider.signOut(event);

    return { message: 'Successfully signed out' };
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to sign out',
    });
  }
});
