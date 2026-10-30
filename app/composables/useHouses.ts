import type {
  House,
  HouseMember,
  ApiResponse,
  Invitation,
  JoinCode,
} from '~/types';

/**
 * Composable to provide houses functionality
 *
 * Provides direct methods for house operations and wraps the houses store
 * with convenient methods and computed properties.
 */
export const useHouses = () => {
  const store = useHousesStore();
  const api = useApi();
  const userStore = useUserStore();
  const baseUrl = '/api/houses';

  const getHouseWithMembers = async (
    houseId: string,
  ): Promise<ApiResponse<House>> => {
    try {
      const result = await api.fetch<{ data: House }>(
        `${baseUrl}/${houseId}`,
        {},
        false,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch house',
      };
    }
  };

  const getCurrentUserHouse = async (): Promise<ApiResponse<House>> => {
    try {
      const result = await api.fetch<{ data: House }>(
        baseUrl,
        {
          params: { current: 'true' },
        },
        false,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error:
          err?.data?.message || err?.message || 'Failed to fetch current house',
      };
    }
  };

  const createHouse = async (
    houseData: Omit<House, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ApiResponse<House>> => {
    try {
      const result = await api.fetch<{ data: House }>(
        baseUrl,
        {
          method: 'POST',
          body: houseData,
        },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to create house',
      };
    }
  };

  const inviteMember = async (
    houseId: string,
    email: string,
  ): Promise<ApiResponse<{ invited: boolean }>> => {
    try {
      const result = await api.fetch<{ data: { invited: boolean } }>(
        `${baseUrl}/${houseId}/members`,
        {
          method: 'POST',
          body: { email },
        },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error:
          err?.data?.message || err?.message || 'Failed to send invitation',
      };
    }
  };

  const removeMember = async (
    houseId: string,
    userId: string,
  ): Promise<ApiResponse<null>> => {
    try {
      await api.fetch(
        `${baseUrl}/${houseId}/members/${userId}`,
        {
          method: 'DELETE',
        },
        true,
      );
      return { data: null, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to remove member',
      };
    }
  };

  const getHouseMembers = async (
    houseId: string,
  ): Promise<ApiResponse<HouseMember[]>> => {
    try {
      const result = await api.fetch<{ data: HouseMember[] }>(
        `${baseUrl}/${houseId}/members`,
        {},
        false,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch members',
      };
    }
  };

  // The owner must pass `newOwnerId`: the server transfers ownership and then
  // removes them in the same request.
  const leaveHouse = async (
    houseId: string,
    newOwnerId?: string,
  ): Promise<ApiResponse<void>> => {
    try {
      await api.fetch(
        `${baseUrl}/${houseId}/leave`,
        {
          method: 'POST',
          body: newOwnerId ? { new_owner_id: newOwnerId } : undefined,
        },
        true,
      );
      return { data: null, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to leave house',
      };
    }
  };

  const generateInvitation = async (
    houseId: string,
    email?: string,
  ): Promise<
    ApiResponse<{
      token: string;
      code?: string | null;
      code_expires_at?: string | null;
    }>
  > => {
    try {
      const result = await api.fetch<{
        data: {
          token: string;
          code?: string | null;
          code_expires_at?: string | null;
        };
      }>(
        `${baseUrl}/${houseId}/invitation/generate`,
        {
          method: 'POST',
          body: email ? { email } : undefined,
        },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error:
          err?.data?.message || err?.message || 'Failed to generate invitation',
      };
    }
  };

  /** The house's current shareable join code (admins only), or null. */
  const getActiveInviteCode = async (
    houseId: string,
  ): Promise<ApiResponse<JoinCode | null>> => {
    try {
      const result = await api.fetch<{ data: JoinCode | null }>(
        `${baseUrl}/${houseId}/invitation/code`,
        {},
        false,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to load join code',
      };
    }
  };

  const getHouseFromToken = async (
    token: string,
  ): Promise<
    ApiResponse<{
      house: House;
      invitation: Partial<Invitation>;
      user_in_house: boolean;
    }>
  > => {
    try {
      const result = await api.fetch<{
        data: {
          house: House;
          invitation: Partial<Invitation>;
          user_in_house: boolean;
        };
      }>(`/api/invitation/${token}`, {}, true);
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error:
          err?.data?.message ||
          err?.message ||
          'Failed to load invitation details',
      };
    }
  };

  const acceptInvitation = async (
    token: string,
  ): Promise<ApiResponse<{ membership: HouseMember; house_id: string }>> => {
    try {
      const result = await api.fetch<{
        data: { membership: HouseMember; house_id: string };
      }>(
        `/api/invitation/${token}/accept`,
        {
          method: 'POST',
        },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error:
          err?.data?.message || err?.message || 'Failed to accept invitation',
      };
    }
  };

  const getUserBalanceInHouse = async (
    houseId: string,
  ): Promise<ApiResponse<{ net_balance: number }>> => {
    try {
      const result = await api.fetch<{
        data: {
          user_balances: Array<{ user_id: string; net_balance: number }>;
        };
      }>(`/api/balance/${houseId}`, {}, false);
      const currentUserId = userStore.currentUser?.id;
      const myBalance = result.data.user_balances.find(
        (ub) => ub.user_id === currentUserId,
      );
      return {
        data: { net_balance: myBalance?.net_balance ?? 0 },
        error: null,
      };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to fetch balance',
      };
    }
  };

  const updateMemberRole = async (
    houseId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<
    ApiResponse<{ id: string; user_id: string; role: 'admin' | 'member' }>
  > => {
    try {
      const result = await api.fetch<{
        data: { id: string; user_id: string; role: 'admin' | 'member' };
      }>(
        `${baseUrl}/${houseId}/members/${userId}`,
        { method: 'PATCH', body: { role } },
        true,
      );
      return { data: result.data, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error: err?.data?.message || err?.message || 'Failed to update role',
      };
    }
  };

  const transferOwnership = async (
    houseId: string,
    userId: string,
  ): Promise<ApiResponse<null>> => {
    try {
      await api.fetch(
        `${baseUrl}/${houseId}/transfer-ownership`,
        { method: 'POST', body: { user_id: userId } },
        true,
      );
      return { data: null, error: null };
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      return {
        data: null,
        error:
          err?.data?.message || err?.message || 'Failed to transfer ownership',
      };
    }
  };

  return {
    // Store state
    ...store,

    // Service methods
    getHouseWithMembers,
    getCurrentUserHouse,
    createHouse,
    inviteMember,
    removeMember,
    getHouseMembers,
    leaveHouse,
    generateInvitation,
    getActiveInviteCode,
    getHouseFromToken,
    acceptInvitation,
    getUserBalanceInHouse,
    updateMemberRole,
    transferOwnership,

    // Additional computed properties
    hasHouse: computed(() => store.currentHouse !== null),
  };
};
