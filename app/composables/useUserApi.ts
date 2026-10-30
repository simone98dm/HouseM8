import type { User } from '~/types';

/**
 * Layer 4: API Composable for Users
 *
 * Responsibilities:
 * - Make HTTP requests via useApi()
 * - Map DTOs to domain objects
 * - Return typed data or null on error
 * - NO business logic
 * - NO state management
 * - NO notifications (stores handle this)
 */
export const useUserApi = () => {
  const api = useApi();
  const baseUrl = '/api/users';

  /**
   * Get user by ID
   * Only returns user if they are in the same house as the current user
   */
  async function getUserById(userId: string): Promise<User | null> {
    try {
      const response = await api.fetch<{ data: User }>(`${baseUrl}/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  async function getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.fetch<{ data: User }>(`${baseUrl}/me`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Update current user profile
   */
  async function updateCurrentUser(data: Partial<User>): Promise<User | null> {
    try {
      const response = await api.fetch<{ data: User }>(`${baseUrl}/me`, {
        method: 'PUT',
        body: data,
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Upload a profile picture
   * Sends multipart/form-data with field name "picture"
   */
  async function uploadPicture(
    file: File,
  ): Promise<{ pictureUrl: string; user: User } | null> {
    try {
      const form = new FormData();
      form.append('picture', file);
      const response = await api.fetch<{
        data: { pictureUrl: string; user: User };
      }>(`${baseUrl}/me/pictures`, {
        method: 'POST',
        body: form,
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Delete a profile picture by its position index in profile_pictures[]
   */
  async function deletePicture(index: number): Promise<User | null> {
    try {
      const response = await api.fetch<{ data: { user: User } }>(
        `${baseUrl}/me/pictures/${index}`,
        { method: 'DELETE' },
      );
      return response.data.user;
    } catch {
      return null;
    }
  }

  /**
   * Wizard Step 1: set name + password for email-registered users
   */
  async function completeSetup(data: {
    firstName: string;
    lastName: string;
  }): Promise<{ success: boolean } | null> {
    try {
      const response = await api.fetch<{ success: boolean }>(
        '/api/user/complete-setup',
        {
          method: 'POST',
          body: data,
        },
      );
      return response;
    } catch {
      return null;
    }
  }

  /**
   * Wizard Step 2: redeem a 6-digit house invite code.
   * Throws the fetch error: the caller maps its HTTP status (423/410/409) to
   * a specific message.
   */
  async function redeemInviteCode(
    code: string,
  ): Promise<{ data: { house_id: string } } | null> {
    return api.fetch<{ data: { house_id: string } }>('/api/invitation/redeem', {
      method: 'POST',
      body: { code },
    });
  }

  return {
    getUserById,
    getCurrentUser,
    updateCurrentUser,
    uploadPicture,
    deletePicture,
    completeSetup,
    redeemInviteCode,
  };
};
