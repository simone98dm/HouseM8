import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getUserPlan, PLAN_LIMITS } from '~~/server/utils/plan-enforcement';

// ponytail: no shared MAX_HOUSE_MEMBERS constant exists in the codebase; 20 is a sane bound
const createHouseSchema = z.object({
  name: z.string().min(1, 'House name is required').max(100),
  address: z.string().max(300).optional(),
  currency: z.enum(['EUR', 'USD']).optional().default('EUR'),
  max_members: z.coerce.number().int().min(1).max(20).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { name, address, currency, max_members } = await readValidatedBody(
    event,
    createHouseSchema.parse,
  );

  const repos = getRepositories();

  const plan = await getUserPlan(user.id);
  const limit = PLAN_LIMITS[plan].maxHouses;
  // Counts houses this user OWNS, not ones they joined. The subscription is
  // per user and pays for houses you create; being invited into a flatmate's
  // house must not consume your own allowance.
  if (limit !== Infinity) {
    const { data: ownedCount } = await repos.houses.countOwnedHouses(user.id);
    if ((ownedCount ?? 0) >= limit) {
      throw createError({
        statusCode: 403,
        statusMessage: `Your plan allows up to ${limit} house${limit === 1 ? '' : 's'}. Upgrade for more.`,
      });
    }
  }

  const { data: house, error } = await repos.houses.create({
    name: name.trim(),
    address: address?.trim() || undefined,
    owner_id: user.id,
    currency,
    max_members,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  if (!house) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create house',
    });
  }

  return { data: house };
});
