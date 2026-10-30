import { getRepositories } from '~~/server/repositories/factory';

/** Throws 403 PROFILE_SHARING_CONSENT_REQUIRED unless profile_sharing is active. */
export async function assertProfileSharingConsent(
  userId: string,
): Promise<void> {
  const { data: consents } =
    await getRepositories().consents.listActive(userId);
  if (!consents?.some((c) => c.purpose === 'profile_sharing')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Profile sharing consent required',
      data: { code: 'PROFILE_SHARING_CONSENT_REQUIRED' },
    });
  }
}
