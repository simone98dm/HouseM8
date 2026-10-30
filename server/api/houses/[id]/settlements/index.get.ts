import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { SETTLEMENT_UNDO_WINDOW_MS } from '~~/server/utils/settlements';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { id: houseId } = await getValidatedRouterParams(
    event,
    paramsSchema.parse,
  );
  const { limit } = await getValidatedQuery(event, querySchema.parse);

  await ensureHouseMember(houseId, user.id);

  const result = await getRepositories().expenses.listSettlements(
    houseId,
    limit,
  );
  if (result.error || !result.data) {
    throw createError({
      statusCode: 500,
      statusMessage: result.error ?? 'Failed to load payments',
    });
  }

  const now = Date.now();
  return {
    data: result.data.map((s) => ({
      id: s.id,
      from_user: s.from_user,
      to_user: s.to_user,
      amount: s.amount,
      kind: s.kind,
      created_at: s.created_at,
      undone_at: s.undone_at,
      // only plan payments are undone here; share payments via "mark unpaid"
      can_undo:
        s.kind === 'settlement' &&
        !s.undone_at &&
        (user.id === s.from_user_id || user.id === s.to_user_id) &&
        now - new Date(s.created_at).getTime() <= SETTLEMENT_UNDO_WINDOW_MS,
    })),
  };
});
