import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useHousesApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  describe('getCurrentHouse', () => {
    it('fetches current house', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const mockHouse = { id: 'h-1', name: 'Current House' };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { getCurrentHouse } = useHousesApi();
      const result = await getCurrentHouse();

      expect(mockFetch).toHaveBeenCalledWith('/api/houses?current=true');
      expect(result).toEqual(mockHouse);
    });

    it('returns null on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getCurrentHouse } = useHousesApi();
      const result = await getCurrentHouse();

      expect(result).toBeNull();
    });
  });

  describe('getHouse', () => {
    it('fetches house by ID', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const mockHouse = { id: 'h-1', name: 'Test House' };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { getHouse } = useHousesApi();
      const result = await getHouse('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1');
      expect(result).toEqual(mockHouse);
    });

    it('returns null on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getHouse } = useHousesApi();
      const result = await getHouse('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getHouseMembers', () => {
    it('fetches house members', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const mockMembers = [
        {
          id: 'm-1',
          house_id: 'h-1',
          user_id: 'u-1',
          role: 'owner',
          joined_at: '2024-01-01',
          is_active: true,
        },
      ];
      mockFetch.mockResolvedValue({ data: mockMembers });

      const { getHouseMembers } = useHousesApi();
      const result = await getHouseMembers('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1/members');
      expect(result).toEqual(mockMembers);
    });

    it('returns empty array when response data is null', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue({ data: null });

      const { getHouseMembers } = useHousesApi();
      const result = await getHouseMembers('h-1');

      expect(result).toEqual([]);
    });

    it('returns null on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getHouseMembers } = useHousesApi();
      const result = await getHouseMembers('h-1');

      expect(result).toBeNull();
    });
  });

  describe('createHouse', () => {
    it('creates house and returns it', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const houseData = { name: 'New House', currency: 'USD' };
      const mockHouse = { id: 'h-new', ...houseData };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { createHouse } = useHousesApi();
      const result = await createHouse(houseData);

      expect(mockFetch).toHaveBeenCalledWith('/api/houses', {
        method: 'POST',
        body: houseData,
      });
      expect(result).toEqual(mockHouse);
    });

    it('returns null on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { createHouse } = useHousesApi();
      const result = await createHouse({ name: 'x', currency: 'USD' });

      expect(result).toBeNull();
    });

    it('forwards max_members in the request body', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const houseData = { name: 'New House', currency: 'USD', max_members: 6 };
      mockFetch.mockResolvedValue({ data: { id: 'h-new', ...houseData } });

      const { createHouse } = useHousesApi();
      await createHouse(houseData);

      expect(mockFetch).toHaveBeenCalledWith('/api/houses', {
        method: 'POST',
        body: expect.objectContaining({ max_members: 6 }),
      });
    });
  });

  describe('updateHouse', () => {
    it('updates house and returns it', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const updates = { name: 'Updated House' };
      const mockHouse = { id: 'h-1', ...updates };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { updateHouse } = useHousesApi();
      const result = await updateHouse('h-1', updates);

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1', {
        method: 'PUT',
        body: updates,
      });
      expect(result).toEqual(mockHouse);
    });

    it('returns null on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { updateHouse } = useHousesApi();
      const result = await updateHouse('h-1', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('deleteHouse', () => {
    it('deletes house and returns true', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue(undefined);

      const { deleteHouse } = useHousesApi();
      const result = await deleteHouse('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1', {
        method: 'DELETE',
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { deleteHouse } = useHousesApi();
      const result = await deleteHouse('h-1');

      expect(result).toBe(false);
    });
  });

  describe('leaveHouse', () => {
    it('leaves house and returns true', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue(undefined);

      const { leaveHouse } = useHousesApi();
      const result = await leaveHouse('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1/leave', {
        method: 'POST',
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { leaveHouse } = useHousesApi();
      const result = await leaveHouse('h-1');

      expect(result).toBe(false);
    });
  });

  describe('archiveHouse', () => {
    it('posts to the archive endpoint and returns true', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue(undefined);

      const { archiveHouse } = useHousesApi();
      const result = await archiveHouse('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1/archive', {
        method: 'POST',
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { archiveHouse } = useHousesApi();
      expect(await archiveHouse('h-1')).toBe(false);
    });
  });

  describe('updateHouse description', () => {
    it('passes description through to the API', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue({ data: { id: 'h-1' } });

      await useHousesApi().updateHouse('h-1', { description: 'Hi' });

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1', {
        method: 'PUT',
        body: { description: 'Hi' },
      });
    });
  });

  describe('inviteUser', () => {
    it('invites user and returns true', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue(undefined);

      const { inviteUser } = useHousesApi();
      const result = await inviteUser('h-1', 'user@example.com');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1/invite', {
        method: 'POST',
        body: { email: 'user@example.com' },
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { inviteUser } = useHousesApi();
      const result = await inviteUser('h-1', 'invalid@example.com');

      expect(result).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('removes member and returns true', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockResolvedValue(undefined);

      const { removeMember } = useHousesApi();
      const result = await removeMember('h-1', 'u-2');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1/members/u-2', {
        method: 'DELETE',
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { removeMember } = useHousesApi();
      const result = await removeMember('h-1', 'invalid-user');

      expect(result).toBe(false);
    });
  });

  describe('switchHouse', () => {
    it('switches house and returns it', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      const mockHouse = { id: 'h-2', name: 'Other House' };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { switchHouse } = useHousesApi();
      const result = await switchHouse('h-2');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-2/switch', {
        method: 'POST',
      });
      expect(result).toEqual(mockHouse);
    });

    it('returns null on error', async () => {
      const { useHousesApi } = await import('~/composables/useHousesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { switchHouse } = useHousesApi();
      const result = await switchHouse('invalid-id');

      expect(result).toBeNull();
    });
  });
});
