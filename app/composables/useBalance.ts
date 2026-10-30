import type { ApiResponse } from '~/types/api';
import type { HouseBalance, RecentPayment } from '~/types/composables/balance';

export interface SettleResponse {
  settlement_id: string;
  /** The amount the server took from the settle-up plan. */
  amount: number;
}

/**
 * Composable to provide balance functionality
 *
 * Provides methods for fetching house balance data.
 */
export const useBalance = () => {
  const api = useApi();
  const baseUrl = '/api/balance';

  const getHouseBalance = async (
    houseId: string,
  ): Promise<ApiResponse<HouseBalance>> => {
    try {
      const result = await api.fetch<{ data: HouseBalance }>(
        `${baseUrl}/${houseId}`,
        {},
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch balance',
      };
    }
  };

  const settleUserToUser = async (
    houseId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<ApiResponse<SettleResponse>> => {
    try {
      const result = await api.fetch<{ data: SettleResponse }>(
        `/api/houses/${houseId}/settle`,
        {
          method: 'POST',
          body: { from_user_id: fromUserId, to_user_id: toUserId },
        },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as {
        statusCode?: number;
        response?: { status?: number };
        data?: { message?: string; data?: { code?: string } };
        message?: string;
      };
      const status = err?.response?.status ?? err?.statusCode;
      return {
        data: null,
        // 409 NOT_IN_PLAN comes back as its code so the page can word it
        error:
          (status === 409 && err?.data?.data?.code) ||
          err?.data?.message ||
          err?.message ||
          'Failed to settle transaction',
      };
    }
  };

  /**
   * Revert a settlement. A 409 (window expired, already undone) comes back as
   * the machine code in `error` so the page can word it; anything else as the
   * server message.
   */
  const undoSettlement = async (
    houseId: string,
    settlementId: string,
  ): Promise<ApiResponse<{ reverted_count: number }>> => {
    try {
      const result = await api.fetch<{ data: { reverted_count: number } }>(
        `/api/houses/${houseId}/settlements/${settlementId}/undo`,
        { method: 'POST' },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as {
        statusCode?: number;
        response?: { status?: number };
        data?: { message?: string; data?: { code?: string } };
        message?: string;
      };
      const status = err?.response?.status ?? err?.statusCode;
      const code = err?.data?.data?.code;
      return {
        data: null,
        error:
          (status === 409 && code) ||
          err?.data?.message ||
          err?.message ||
          'Failed to undo settlement',
      };
    }
  };

  const getRecentPayments = async (
    houseId: string,
    limit = 20,
  ): Promise<ApiResponse<RecentPayment[]>> => {
    try {
      const result = await api.fetch<{ data: RecentPayment[] }>(
        `/api/houses/${houseId}/settlements?limit=${limit}`,
        {},
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch payments',
      };
    }
  };

  return {
    getRecentPayments,
    getHouseBalance,
    settleUserToUser,
    undoSettlement,
  };
};
