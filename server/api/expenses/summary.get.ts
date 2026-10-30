import { verifyAuth } from '~~/server/utils/auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuth(event);
  const query = getQuery(event);
  const { house_id } = query;

  if (!house_id || typeof house_id !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  const repos = getRepositories();

  // Verify user is member of house
  const isMember = await repos.houses.isMember(house_id, user.id);

  if (!isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not a member of this house',
    });
  }

  // Get user's balance for this house
  const { data: balance, error } = await repos.balance.getUserBalance(
    house_id,
    user.id,
  );

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch expense summary',
    });
  }

  if (!balance) {
    // Return zero balance if no data
    return {
      data: {
        total_owed: 0,
        total_paid: 0,
        outstanding_balance: 0,
      },
    };
  }

  // Calculate summary from balance data
  const total_owed = balance.total_owed;
  const total_paid = balance.total_owed - balance.net_balance;
  const outstanding_balance = balance.net_balance;

  return {
    data: {
      total_owed,
      total_paid,
      outstanding_balance,
    },
  };
});
