import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { toPublicMembers } from '~~/server/utils/public-profile';
import type { PublicUserProfile } from '~~/app/types/domain/user';
import { logger } from '~~/server/utils/logger';
import { toCents } from '#shared/utils/money';

/**
 * GET /api/gdpr/pending-summary
 *
 * Per-house balances between the caller and each active housemate, shown on
 * the pending-deletion page. Allowed while the account is in the deletion
 * grace period (memberships stay open then; only solo-owned houses are
 * archived and are excluded here).
 *
 * No query/body input, so there is nothing to validate with Zod.
 * Figures match the Balance page: the settle-up transfers from
 * `getHouseBalance`, in integer cents. Housemates are projected through
 * `toPublicMembers` only - never email.
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const repos = getRepositories();

  try {
    // Membership is enforced by the query itself (left_at IS NULL, caller id).
    const { data: allHouses, error: housesError } =
      await repos.houses.getHousesForUser(user.id);
    if (housesError) throw new Error(housesError);
    const houses = (allHouses ?? []).filter((h) => h.status !== 'archived');

    const result = await Promise.all(
      houses.map(async (house) => {
        const [balanceRes, membersRes] = await Promise.all([
          repos.balance.getHouseBalance(house.id),
          repos.houses.getMembers(house.id),
        ]);
        if (balanceRes.error || !balanceRes.data) {
          throw new Error(balanceRes.error ?? 'Balance unavailable');
        }
        if (membersRes.error) throw new Error(membersRes.error);

        // Net cents from the caller's point of view, per counterpart id.
        const netByUser = new Map<string, number>();
        for (const t of balanceRes.data.user_to_user_balances) {
          const cents = toCents(t.amount);
          if (t.from_user_id === user.id) {
            netByUser.set(
              t.to_user_id,
              (netByUser.get(t.to_user_id) ?? 0) - cents,
            );
          } else if (t.to_user_id === user.id) {
            netByUser.set(
              t.from_user_id,
              (netByUser.get(t.from_user_id) ?? 0) + cents,
            );
          }
        }

        // Active housemates only (getMembers filters left/deleted). The
        // joined user goes through toPublicMembers: id, name, avatar - never
        // email. No per-housemate lookups; the optional profile_sharing
        // fields are not needed for this page.
        const counterparts = toPublicMembers(membersRes.data ?? [])
          .filter((m) => m.user_id !== user.id && m.user)
          .map((m) => ({
            user: m.user as PublicUserProfile,
            net_cents: netByUser.get(m.user_id) ?? 0,
          }));

        return {
          id: house.id,
          name: house.name,
          currency: house.currency,
          counterparts,
        };
      }),
    );

    return { data: { houses: result } };
  } catch (error) {
    logger.error('pending-summary failed', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not load balances',
    });
  }
});
