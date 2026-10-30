import type { PublicUserProfile } from '~~/app/types/domain/user';
import type { User } from '~~/server/repositories/interfaces/IUserRepository';
import { PROFILE_SHARING_COLUMNS } from '~~/server/repositories/postgres/PostgresConsentRepository';

/**
 * Public view of a user for housemates. Id, name and avatar are always shown;
 * the optional profile fields only while the user's `profile_sharing` consent
 * is active. Built by allow-list: email and internal fields never leak.
 */
export function toPublicProfile(
  user: User,
  hasSharingConsent: boolean,
): PublicUserProfile {
  const profile: PublicUserProfile = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar_url: user.avatar_url ?? null,
  };
  if (!hasSharingConsent) return profile;

  const optional: Record<string, unknown> = {};
  for (const column of PROFILE_SHARING_COLUMNS) {
    optional[column] = (user as unknown as Record<string, unknown>)[column];
  }
  return { ...profile, ...optional } as PublicUserProfile;
}

/**
 * Members as housemates may see them: the joined user drops `email` (and any
 * other non-public field). Server code that needs emails (reminders,
 * invitation notices) reads the repository directly, never this response.
 */
export function toPublicMembers<
  M extends {
    user?: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      avatar_url?: string | null;
    } | null;
  },
>(members: M[]): M[] {
  return members.map((member) =>
    member.user
      ? {
          ...member,
          user: {
            id: member.user.id,
            first_name: member.user.first_name,
            last_name: member.user.last_name,
            avatar_url: member.user.avatar_url ?? null,
          },
        }
      : member,
  );
}
