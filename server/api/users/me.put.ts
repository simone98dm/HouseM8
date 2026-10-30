import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { PROFILE_SHARING_COLUMNS } from '~~/server/repositories/postgres/PostgresConsentRepository';
import { assertProfileSharingConsent } from '~~/server/utils/profile-consent';
import { OCCUPATION_TYPES } from '~~/server/repositories/interfaces/IUserRepository';

/**
 * PUT /api/users/me
 * Update current authenticated user's profile
 */

// CSP is img-src 'self': only a site-relative path or an https URL on our own
// host can render, so nothing else is accepted (blocks tracking pixels / javascript: URLs).
const avatarUrlSchema = z
  .string()
  .max(500)
  .refine((v) => {
    if (v.startsWith('/')) return !v.startsWith('//') && !v.includes('\\');
    try {
      const url = new URL(v);
      const own = new URL(process.env.BASE_URL ?? 'http://localhost:3000');
      return url.protocol === 'https:' && url.host === own.host;
    } catch {
      return false;
    }
  }, 'Invalid avatar URL');

const profileUpdateSchema = z
  .object({
    first_name: z.string().min(1).max(50),
    last_name: z.string().min(1).max(50),
    preferred_currency: z.enum(['USD', 'EUR']),
    avatar_url: avatarUrlSchema.nullable(),
    bio: z.string().max(500).nullable(),
    is_first_access: z.boolean(),
    gender: z.string().max(50).nullable(),
    occupation_type: z.enum(OCCUPATION_TYPES).nullable(),
    study_field: z.string().max(100).nullable(),
    job_title: z.string().max(100).nullable(),
    languages: z.array(z.string().max(50)).max(20).nullable(),
    pets: z.string().max(200).nullable(),
    telephone: z.string().max(20).nullable(),
    instagram: z.string().max(100).nullable(),
    twitter: z.string().max(100).nullable(),
    linkedin: z.string().max(200).nullable(),
    tiktok: z.string().max(100).nullable(),
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const updates = await readValidatedBody(event, profileUpdateSchema.parse);

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No valid fields to update',
    });
  }

  const repos = getRepositories();

  // Optional profile data needs an active profile_sharing consent.
  const touchesOptional = PROFILE_SHARING_COLUMNS.some((c) => c in updates);
  if (touchesOptional) {
    await assertProfileSharingConsent(user.id);
  }

  // `email` is intentionally not updatable here (see POST /api/users/me/email).
  const { data, error } = await repos.users.update(user.id, updates);

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    });
  }

  return { data };
});
