import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseOwner,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

// ponytail: same 20-member bound as create; no shared constant to reuse
const updateHouseSchema = z.object({
  name: z.string().min(1, 'House name is required').max(100).optional(),
  address: z.string().max(300).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  currency: z.enum(['USD', 'EUR']).optional(),
  max_members: z.coerce.number().int().min(1).max(20).optional(),
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

  const { name, address, description, currency, max_members } =
    await readValidatedBody(event, updateHouseSchema.parse);

  // Verify user is owner of the house
  await ensureHouseOwner(houseId, user.id);

  // Update the house
  const updateData: {
    name?: string;
    address?: string | null;
    description?: string | null;
    currency?: 'USD' | 'EUR';
    max_members?: number;
  } = {
    name: name?.trim(),
  };

  // Omitted leaves the address alone; an empty string clears it.
  if (address !== undefined) {
    updateData.address = address.trim() || null;
  }

  // Empty string clears the description
  if (description !== undefined) {
    updateData.description = description || null;
  }

  // Only update currency if provided
  if (currency) {
    updateData.currency = currency;
  }

  if (max_members !== undefined) {
    updateData.max_members = max_members;
  }

  const repos = getRepositories();

  // The size can't drop below the housemates already living there.
  if (max_members !== undefined) {
    const { data: members, error: membersError } =
      await repos.houses.getMembers(houseId);
    if (membersError) {
      throw createError({ statusCode: 500, statusMessage: membersError });
    }
    if (max_members < (members?.length ?? 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'max_members is below the current member count',
      });
    }
  }

  const { data: updatedHouse, error } = await repos.houses.update(
    houseId,
    updateData,
  );

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  if (!updatedHouse) {
    throw createError({
      statusCode: 404,
      statusMessage: 'House not found',
    });
  }

  return { data: updatedHouse };
});
