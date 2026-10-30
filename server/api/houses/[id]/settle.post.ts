import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';

const bodySchema = z.object({
  from_user_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
});

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

  const { from_user_id, to_user_id } = await readValidatedBody(
    event,
    bodySchema.parse,
  );

  // Only the debtor or the creditor can trigger settlement
  if (user.id !== from_user_id && user.id !== to_user_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not authorized to settle this transaction',
    });
  }

  // The repository recomputes the plan under a per-house lock and takes the
  // amount from it: the client only names the pair, so it can neither invent a
  // transfer, pick the amount, nor double-pay through a concurrent request.
  const result = await getRepositories().expenses.recordSettlement(
    houseId,
    from_user_id,
    to_user_id,
    user.id,
  );
  if (result.error === 'NOT_IN_PLAN') {
    throw createError({
      statusCode: 409,
      statusMessage: 'This payment is no longer part of the settle-up plan',
      data: { code: 'NOT_IN_PLAN' },
    });
  }
  if (result.error || !result.data) {
    throw createError({
      statusCode: 500,
      statusMessage: result.error ?? 'Settlement failed',
    });
  }

  const { settlementId, amount } = result.data;
  await logSecurityEvent('settlement_recorded', {
    userId: user.id,
    event,
    metadata: { house_id: houseId, settlement_id: settlementId },
  });

  return { data: { settlement_id: settlementId, amount } };
});
