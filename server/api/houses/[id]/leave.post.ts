import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { sendLeavingHomeConfirmation } from '~~/server/emails';
import { getBaseUrl } from '~~/server/utils/email';
import { transferHouseOwnership } from '~~/server/utils/house-ownership';

// The owner leaves by naming a successor in the same request; everyone else
// sends no body.
const bodySchema = z
  .object({ new_owner_id: z.string().uuid().optional() })
  .optional();

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const houseId = getRouterParam(event, 'id');

  if (!houseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  await ensureHouseMember(houseId, user.id);

  const repos = getRepositories();

  // One owner per house (DB-enforced): the owner may only leave by handing
  // the role to another member, otherwise the house would be orphaned.
  const body = await readValidatedBody(event, bodySchema.parse);
  const newOwnerId = body?.new_owner_id;
  const isOwner = await repos.houses.isOwner(houseId, user.id);
  if (isOwner && !newOwnerId) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'The house owner must transfer ownership before leaving the house.',
    });
  }

  // All balances (debts and credits) must be settled
  const { data: balance, error: balanceError } =
    await repos.balance.getUserBalance(houseId, user.id);
  if (balanceError || !balance) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check balance',
    });
  }

  if (balance.net_balance < -0.01) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Settle all balances before leaving the house',
    });
  }

  // Balance is checked first so a blocked leave never transfers ownership.
  if (isOwner && newOwnerId) {
    await transferHouseOwnership(houseId, user.id, newOwnerId);
  }

  // Remove member
  const result = await repos.houses.removeMember(houseId, user.id);
  if (result.error) {
    throw createError({
      statusCode: 500,
      statusMessage: result.error || 'Failed to leave house',
    });
  }

  // Archive house if no active members remain
  const { data: remaining } = await repos.houses.getMembers(houseId);
  if (!remaining || remaining.length === 0) {
    const { error: archiveError } = await repos.houses.archiveHouse(houseId);
    if (archiveError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to archive house',
      });
    }
  }

  // Send confirmation email (non-blocking)
  const houseResult = await repos.houses.getById(houseId, false);
  const userResult = await repos.users.getById(user.id);
  if (houseResult.data && userResult.data) {
    const baseURL = getBaseUrl();
    sendLeavingHomeConfirmation({
      email: userResult.data.email,
      userName: `${userResult.data.first_name} ${userResult.data.last_name}`,
      houseName: houseResult.data.name,
      ratingLink: `${baseURL}/houses/${houseId}/rating`,
    }).catch(() => {});
  }

  return { data: { message: 'Successfully left house' } };
});
