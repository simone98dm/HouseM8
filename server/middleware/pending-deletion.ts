// server/middleware/pending-deletion.ts
//
// Accounts in the deletion grace period (users.deleted_at set) can only read
// their own profile, cancel the deletion, export their data and sign out.
// Everything else under /api answers 403 ACCOUNT_PENDING_DELETION.
//
// Cost: one indexed lookup by primary key, only for requests carrying a valid
// token. The user is identified from the access token, or from the refresh
// token when the access one has expired (the route handler would otherwise
// silently re-issue an access token for the pending user).
import consola from 'consola';
import { getRepositories } from '../repositories/factory';
import { getAccessToken, getRefreshToken, verifyToken } from '../utils/jwt';

const ALLOWED: Array<{ method?: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /^\/api\/users\/me\/?$/ },
  { pattern: /^\/api\/gdpr\/cancel-delete\/?$/ },
  { pattern: /^\/api\/gdpr\/export\/?$/ },
  { method: 'GET', pattern: /^\/api\/gdpr\/pending-summary\/?$/ },
  { pattern: /^\/api\/auth\/signout\/?$/ },
  { pattern: /^\/api\/auth\/refresh\/?$/ },
  { pattern: /^\/api\/feature-flags\/?$/ },
];

async function resolveUserId(
  event: Parameters<typeof getAccessToken>[0],
): Promise<string | null> {
  const access = getAccessToken(event);
  const accessPayload = access ? await verifyToken(access, 'access') : null;
  if (accessPayload) return accessPayload.userId;

  const refresh = getRefreshToken(event);
  const refreshPayload = refresh ? await verifyToken(refresh, 'refresh') : null;
  return refreshPayload?.userId ?? null;
}

export default defineEventHandler(async (event) => {
  const path = (event.path ?? '').split('?')[0] ?? '';
  if (!path.startsWith('/api/')) return;
  if (
    ALLOWED.some(
      (r) => r.pattern.test(path) && (!r.method || r.method === event.method),
    )
  ) {
    return;
  }

  const userId = await resolveUserId(event);
  if (!userId) return;

  let deletedAt: string | null | undefined;
  try {
    const { data, error } = await getRepositories().users.getById(userId);
    if (error) consola.warn('pending-deletion lookup returned an error', error);
    deletedAt = data?.deleted_at;
  } catch (error) {
    // Fail open: the route's own auth still applies.
    consola.error('pending-deletion lookup failed', error);
    return;
  }

  if (deletedAt) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Account is pending deletion',
      data: { code: 'ACCOUNT_PENDING_DELETION' },
    });
  }
});
