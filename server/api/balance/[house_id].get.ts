import { getRepositories } from '~~/server/repositories/factory';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler(async (event) => {
  try {
    // 1. Verify authentication
    const user = await verifyAuthCompat(event);

    // 2. Get house ID from route
    const houseId = getRouterParam(event, 'house_id');

    if (!houseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'House ID is required',
      });
    }

    // 3. Verify user is member of house
    await ensureHouseMember(houseId, user.id);

    // 4. Get house balance from repository
    const repos = getRepositories();
    const { data: balance, error } =
      await repos.balance.getHouseBalance(houseId);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error,
      });
    }

    if (!balance) {
      throw createError({
        statusCode: 404,
        statusMessage: 'House not found',
      });
    }

    const { data: house } = await repos.houses.getById(houseId);

    // 5. Transform repository data to match composable expectations
    const transformedBalance = {
      house_id: balance.house_id,
      currency: house?.currency ?? 'USD',
      user_balances: balance.user_balances.map((ub) => ({
        user_id: ub.user_id,
        user: ub.user
          ? {
              id: ub.user.id,
              first_name: ub.user.first_name,
              last_name: ub.user.last_name,
              // Housemates never see email (toPublicProfile rule).
            }
          : undefined,
        total_paid: ub.total_owed_to_user, // Amount others owe to this user
        total_owed: ub.total_owed, // Amount this user owes
        net_balance: ub.net_balance,
      })),
      settlement_transactions: balance.user_to_user_balances.map((u2u) => ({
        from_user_id: u2u.from_user_id,
        to_user_id: u2u.to_user_id,
        amount: u2u.amount,
        due_date: u2u.due_date,
        from_user: u2u.from_user
          ? {
              id: u2u.from_user.id,
              first_name: u2u.from_user.first_name,
            }
          : undefined,
        to_user: u2u.to_user
          ? {
              id: u2u.to_user.id,
              first_name: u2u.to_user.first_name,
            }
          : undefined,
      })),
      total_expenses: balance.total_expenses,
      is_balanced: balance.user_balances.every(
        (ub) => Math.abs(ub.net_balance) < 0.01,
      ),
    };

    return { data: transformedBalance };
  } catch (error) {
    logger.error(error);
    throw error;
  }
});
