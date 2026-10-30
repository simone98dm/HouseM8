import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useUserApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  describe('getUserById', () => {
    it('fetches user by ID', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        created_at: '2025-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { getUserById } = useUserApi();
      const result = await getUserById('u-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/users/u-1');
      expect(result).toEqual(mockUser);
    });

    it('returns null on error', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getUserById } = useUserApi();
      const result = await getUserById('u-1');

      expect(result).toBeNull();
    });

    it('handles 404 not found errors gracefully', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      mockFetch.mockRejectedValue({
        statusCode: 404,
        message: 'User not found',
      });

      const { getUserById } = useUserApi();
      const result = await getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('handles 403 forbidden errors gracefully', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      mockFetch.mockRejectedValue({ statusCode: 403, message: 'Forbidden' });

      const { getUserById } = useUserApi();
      const result = await getUserById('u-1');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const mockUser = {
        id: 'u-1',
        email: 'me@example.com',
        first_name: 'Me',
        last_name: 'User',
        created_at: '2025-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { getCurrentUser } = useUserApi();
      const result = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith('/api/users/me');
      expect(result).toEqual(mockUser);
    });

    it('returns null on error', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getCurrentUser } = useUserApi();
      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('updateCurrentUser', () => {
    it('updates current user with PUT', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const updateData = { first_name: 'Updated', last_name: 'Name' };
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        ...updateData,
        created_at: '2025-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { updateCurrentUser } = useUserApi();
      const result = await updateCurrentUser(updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {
        method: 'PUT',
        body: updateData,
      });
      expect(result).toEqual(mockUser);
    });

    it('returns null on error', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { updateCurrentUser } = useUserApi();
      const result = await updateCurrentUser({ first_name: 'x' });

      expect(result).toBeNull();
    });

    it('unwraps data from response wrapper', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        created_at: '',
      };
      mockFetch.mockResolvedValue({ data: mockUser });

      const { getUserById } = useUserApi();
      const result = await getUserById('u-1');

      // Should return the user directly, not the wrapper
      expect(result).toEqual(mockUser);
      expect((result as any)?.data).toBeUndefined();
    });
  });

  describe('uploadPicture', () => {
    it('uploads file and returns pictureUrl + updated user', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const mockFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        data: {
          pictureUrl: 'https://cdn.example.com/photo.jpg',
          user: {
            id: 'u-1',
            email: 'a@b.com',
            first_name: 'A',
            last_name: 'B',
          },
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { uploadPicture } = useUserApi();
      const result = await uploadPicture(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/me/pictures',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('returns null on upload error', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const mockFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      mockFetch.mockRejectedValue(new Error('Upload failed'));

      const { uploadPicture } = useUserApi();
      const result = await uploadPicture(mockFile);

      expect(result).toBeNull();
    });
  });

  describe('deletePicture', () => {
    it('calls DELETE endpoint with correct index and returns updated user', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      const mockUser = {
        id: 'u-1',
        email: 'a@b.com',
        first_name: 'A',
        last_name: 'B',
      };
      mockFetch.mockResolvedValue({ data: { user: mockUser } });

      const { deletePicture } = useUserApi();
      const result = await deletePicture(2);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/me/pictures/2',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(result).toEqual(mockUser);
    });

    it('returns null on delete error', async () => {
      const { useUserApi } = await import('~/composables/useUserApi');
      mockFetch.mockRejectedValue(new Error('Delete failed'));

      const { deletePicture } = useUserApi();
      const result = await deletePicture(0);

      expect(result).toBeNull();
    });
  });
});
