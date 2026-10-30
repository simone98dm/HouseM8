import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';
import { useHousesStore } from '~/stores/houses';
import { useUserStore } from '~/stores/user';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('~/stores/houses', () => ({
  useHousesStore: vi.fn(),
}));

vi.mock('~/stores/user', () => ({
  useUserStore: vi.fn(),
}));

describe('useHouses', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockStore: any;
  let mockUserStore: any;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    mockStore = {
      currentHouse: null,
      houses: [],
    };
    mockUserStore = {
      currentUser: { id: 'test-user-id' },
    };
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
    vi.mocked(useHousesStore).mockReturnValue(mockStore as any);
    vi.mocked(useUserStore).mockReturnValue(mockUserStore as any);
  });

  describe('getHouseWithMembers', () => {
    it('fetches house with members', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      const mockHouse = { id: 'h-1', name: 'Test House' };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { getHouseWithMembers } = useHouses();
      const result = await getHouseWithMembers('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/houses/h-1', {}, false);
      expect(result.data).toEqual(mockHouse);
      expect(result.error).toBeNull();
    });

    it('handles error with message in data', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({ data: { message: 'House not found' } });

      const { getHouseWithMembers } = useHouses();
      const result = await getHouseWithMembers('invalid-id');

      expect(result.data).toBeNull();
      expect(result.error).toBe('House not found');
    });

    it('uses fallback message when error has no message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({});

      const { getHouseWithMembers } = useHouses();
      const result = await getHouseWithMembers('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch house');
    });
  });

  describe('getCurrentUserHouse', () => {
    it('fetches current user house', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      const mockHouse = { id: 'h-1', name: 'Current House' };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { getCurrentUserHouse } = useHouses();
      const result = await getCurrentUserHouse();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses',
        { params: { current: 'true' } },
        false,
      );
      expect(result.data).toEqual(mockHouse);
    });

    it('handles error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { getCurrentUserHouse } = useHouses();
      const result = await getCurrentUserHouse();

      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('createHouse', () => {
    it('creates house successfully', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      const houseData = {
        name: 'New House',
        address: '123 St',
        currency: 'USD' as const,
        owner_id: 'u-1',
        member_count: 1,
        members: [],
        invitations: [],
        max_members: 10,
        status: 'active' as const,
      };
      const mockHouse = {
        id: 'h-new',
        ...houseData,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue({ data: mockHouse });

      const { createHouse } = useHouses();
      const result = await createHouse(houseData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses',
        { method: 'POST', body: houseData },
        true,
      );
      expect(result.data).toEqual(mockHouse);
    });

    it('handles error on create', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Validation failed'));

      const { createHouse } = useHouses();
      const result = await createHouse({
        name: 'x',
        address: '',
        currency: 'USD',
        owner_id: 'u-1',
        member_count: 0,
        members: [],
        invitations: [],
        max_members: 10,
        status: 'active' as const,
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('inviteMember', () => {
    it('sends an invitation and returns the generic confirmation', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue({ data: { invited: true } });

      const { inviteMember } = useHouses();
      const result = await inviteMember('h-1', 'user2@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses/h-1/members',
        { method: 'POST', body: { email: 'user2@example.com' } },
        true,
      );
      expect(result.data).toEqual({ invited: true });
      expect(result.error).toBeNull();
    });

    it('handles invite error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Forbidden'));

      const { inviteMember } = useHouses();
      const result = await inviteMember('h-1', 'invalid@example.com');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Forbidden');
    });
  });

  describe('removeMember', () => {
    it('removes member successfully', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue(undefined);

      const { removeMember } = useHouses();
      const result = await removeMember('h-1', 'u-2');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses/h-1/members/u-2',
        { method: 'DELETE' },
        true,
      );
      expect(result).toEqual({ data: null, error: null });
    });

    it('handles remove member error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Member not found'));

      const { removeMember } = useHouses();
      const result = await removeMember('h-1', 'invalid-user');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Member not found');
    });
  });

  describe('getHouseMembers', () => {
    it('fetches members successfully', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue({ data: [{ id: 'm-1' }] });

      const { getHouseMembers } = useHouses();
      const result = await getHouseMembers('h-1');

      expect(result.data).toEqual([{ id: 'm-1' }]);
      expect(result.error).toBeNull();
    });

    it('handles error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const { getHouseMembers } = useHouses();
      const result = await getHouseMembers('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Fetch failed');
    });
  });

  describe('leaveHouse', () => {
    it('leaves house successfully', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue(undefined);

      const { leaveHouse } = useHouses();
      const result = await leaveHouse('h-1');

      expect(result).toEqual({ data: null, error: null });
    });

    it('handles leave error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Cannot leave'));

      const { leaveHouse } = useHouses();
      const result = await leaveHouse('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Cannot leave');
    });
  });

  describe('generateInvitation', () => {
    it('generates invitation token', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue({ data: { token: 'tok-abc' } });

      const { generateInvitation } = useHouses();
      const result = await generateInvitation('h-1');

      expect(result.data).toEqual({ token: 'tok-abc' });
      expect(result.error).toBeNull();
    });

    it('handles error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Failed'));

      const { generateInvitation } = useHouses();
      const result = await generateInvitation('h-1');

      expect(result.data).toBeNull();
    });
  });

  describe('getHouseFromToken', () => {
    it('returns house and invitation for valid token', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      const payload = { house: { id: 'h-1' }, invitation: { id: 'inv-1' } };
      mockFetch.mockResolvedValue({ data: payload });

      const { getHouseFromToken } = useHouses();
      const result = await getHouseFromToken('tok-abc');

      expect(result.data).toEqual(payload);
      expect(result.error).toBeNull();
    });

    it('handles error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Invalid token'));

      const { getHouseFromToken } = useHouses();
      const result = await getHouseFromToken('bad-token');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('acceptInvitation', () => {
    it('accepts invitation and returns membership', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      const payload = { membership: { id: 'm-1' }, house_id: 'h-1' };
      mockFetch.mockResolvedValue({ data: payload });

      const { acceptInvitation } = useHouses();
      const result = await acceptInvitation('tok-abc');

      expect(result.data).toEqual(payload);
      expect(result.error).toBeNull();
    });

    it('handles error', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Invitation expired'));

      const { acceptInvitation } = useHouses();
      const result = await acceptInvitation('expired-token');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Invitation expired');
    });
  });

  describe('getUserBalanceInHouse', () => {
    it('returns net_balance for the current user', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue({
        data: {
          user_balances: [
            { user_id: 'test-user-id', net_balance: 42.5 },
            { user_id: 'other-user', net_balance: -10 },
          ],
        },
      });

      const { getUserBalanceInHouse } = useHouses();
      const result = await getUserBalanceInHouse('h-1');

      expect(result.data).toEqual({ net_balance: 42.5 });
      expect(result.error).toBeNull();
    });

    it('returns 0 when current user has no balance entry', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockResolvedValue({
        data: { user_balances: [] },
      });

      const { getUserBalanceInHouse } = useHouses();
      const result = await getUserBalanceInHouse('h-1');

      expect(result.data).toEqual({ net_balance: 0 });
      expect(result.error).toBeNull();
    });

    it('handles error with data.message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({ data: { message: 'House not found' } });

      const { getUserBalanceInHouse } = useHouses();
      const result = await getUserBalanceInHouse('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('House not found');
    });

    it('handles error with top-level message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const { getUserBalanceInHouse } = useHouses();
      const result = await getUserBalanceInHouse('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Network failure');
    });

    it('uses fallback message when error has no message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({});

      const { getUserBalanceInHouse } = useHouses();
      const result = await getUserBalanceInHouse('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch balance');
    });
  });

  describe('updateMemberRole', () => {
    it('updates member role successfully', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      const mockData = { id: 'm-1', user_id: 'u-2', role: 'owner' as const };
      mockFetch.mockResolvedValue({ data: mockData });

      const { updateMemberRole } = useHouses();
      const result = await updateMemberRole('h-1', 'u-2', 'owner');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses/h-1/members/u-2',
        { method: 'PATCH', body: { role: 'owner' } },
        true,
      );
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('handles error with data.message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({ data: { message: 'Unauthorized' } });

      const { updateMemberRole } = useHouses();
      const result = await updateMemberRole('h-1', 'u-2', 'member');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Unauthorized');
    });

    it('handles error with top-level message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue(new Error('Server error'));

      const { updateMemberRole } = useHouses();
      const result = await updateMemberRole('h-1', 'u-2', 'member');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Server error');
    });

    it('uses fallback message when error has no message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({});

      const { updateMemberRole } = useHouses();
      const result = await updateMemberRole('h-1', 'u-2', 'member');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to update role');
    });
  });

  describe('hasHouse computed', () => {
    it('returns false when currentHouse is null', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockStore.currentHouse = null;

      const { hasHouse } = useHouses();
      expect(hasHouse.value).toBe(false);
    });

    it('returns true when currentHouse is set', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockStore.currentHouse = { id: 'h-1', name: 'Test' };

      const { hasHouse } = useHouses();
      expect(hasHouse.value).toBe(true);
    });
  });

  describe('leaveHouse error handling', () => {
    it('handles error with data.message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({
        data: { message: 'Cannot leave as owner' },
      });

      const { leaveHouse } = useHouses();
      const result = await leaveHouse('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Cannot leave as owner');
    });

    it('uses fallback when error has no message', async () => {
      const { useHouses } = await import('~/composables/useHouses');
      mockFetch.mockRejectedValue({});

      const { leaveHouse } = useHouses();
      const result = await leaveHouse('h-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to leave house');
    });
  });
});
