import type { House, HouseMember } from '~/types';

/**
 * Layer 4: API Composable for Houses
 *
 * Responsibilities:
 * - Make HTTP requests via useApi()
 * - Map DTOs to domain objects
 * - Return typed data or null on error
 * - NO business logic
 * - NO state management
 * - NO notifications (stores handle this)
 */
export const useHousesApi = () => {
  const api = useApi();
  const baseUrl = '/api/houses';

  /**
   * Get user's current active house
   */
  const getCurrentHouse = async (): Promise<House | null> => {
    try {
      const result = await api.fetch<{ data: House }>(
        `${baseUrl}?current=true`,
      );
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Get a specific house by ID
   */
  const getHouse = async (houseId: string): Promise<House | null> => {
    try {
      const result = await api.fetch<{ data: House }>(`${baseUrl}/${houseId}`);
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Get members of a house
   */
  const getHouseMembers = async (
    houseId: string,
  ): Promise<HouseMember[] | null> => {
    try {
      const result = await api.fetch<{ data: HouseMember[] }>(
        `${baseUrl}/${houseId}/members`,
      );
      return result.data || [];
    } catch {
      return null;
    }
  };

  /**
   * Create a new house
   */
  const createHouse = async (data: {
    name: string;
    description?: string;
    currency: string;
    max_members?: number;
  }): Promise<House | null> => {
    try {
      const result = await api.fetch<{ data: House }>(baseUrl, {
        method: 'POST',
        body: data,
      });
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Update house details
   */
  const updateHouse = async (
    houseId: string,
    updates: Partial<House>,
  ): Promise<House | null> => {
    try {
      const result = await api.fetch<{ data: House }>(`${baseUrl}/${houseId}`, {
        method: 'PUT',
        body: updates,
      });
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Delete a house
   */
  const deleteHouse = async (houseId: string): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${houseId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Leave a house
   */
  const leaveHouse = async (houseId: string): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${houseId}/leave`, { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Archive a house (owner only)
   */
  const archiveHouse = async (houseId: string): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${houseId}/archive`, { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Invite user to house
   */
  const inviteUser = async (
    houseId: string,
    email: string,
  ): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${houseId}/invite`, {
        method: 'POST',
        body: { email },
      });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Remove member from house
   */
  const removeMember = async (
    houseId: string,
    userId: string,
  ): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${houseId}/members/${userId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Switch to a different house
   */
  const switchHouse = async (houseId: string): Promise<House | null> => {
    try {
      const result = await api.fetch<{ data: House }>(
        `${baseUrl}/${houseId}/switch`,
        {
          method: 'POST',
        },
      );
      return result.data;
    } catch {
      return null;
    }
  };

  return {
    getCurrentHouse,
    getHouse,
    getHouseMembers,
    createHouse,
    updateHouse,
    deleteHouse,
    leaveHouse,
    archiveHouse,
    inviteUser,
    removeMember,
    switchHouse,
  };
};
