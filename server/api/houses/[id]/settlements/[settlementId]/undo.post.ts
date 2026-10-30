import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { SETTLEMENT_UNDO_WINDOW_MS } from '~~/server/utils/settlements';

const paramsSchema = z.object({
  id: z.string().uuid(),
  settlementId: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { id: houseId, settlementId } = await getValidatedRouterParams(
    event,
    paramsSchema.parse,
  );

  await ensureHouseMember(houseId, user.id);

  const repos = getRepositories();
  const found = await repos.expenses.getSettlement(houseId, settlementId);
  if (found.error) {
    throw createError({ statusCode: 500, statusMessage: found.error });
  }
  const settlement = found.data;
  // Other houses' settlements look the same as missing ones.
  if (!settlement) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Settlement not found',
    });
  }

  // Only the two people the payment is between can take it back.
  if (
    user.id !== settlement.from_user_id &&
    user.id !== settlement.to_user_id
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not authorized to undo this settlement',
    });
  }

  // A per-expense payment is taken back by marking that share unpaid.
  if (settlement.kind !== 'settlement') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Mark the expense share as unpaid instead',
      data: { code: 'SHARE_PAYMENT' },
    });
  }

  if (settlement.undone_at) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Settlement already undone',
      data: { code: 'ALREADY_UNDONE' },
    });
  }

  const age = Date.now() - new Date(settlement.created_at).getTime();
  if (age > SETTLEMENT_UNDO_WINDOW_MS) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Undo window expired',
      data: { code: 'UNDO_WINDOW_EXPIRED' },
    });
  }

  const result = await repos.expenses.undoSettlement(houseId, settlementId);
  if (result.error === 'ALREADY_UNDONE') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Settlement already undone',
      data: { code: 'ALREADY_UNDONE' },
    });
  }
  if (result.error === 'SETTLEMENT_NOT_FOUND') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Settlement not found',
    });
  }
  if (result.error || !result.data) {
    throw createError({
      statusCode: 500,
      statusMessage: result.error ?? 'Undo failed',
    });
  }

  await logSecurityEvent('settlement_undone', {
    userId: user.id,
    event,
    metadata: { house_id: houseId, settlement_id: settlementId },
  });

  return { data: { reverted_count: result.data.count } };
});
