/**
 * Houses Store Tests — real store with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useHousesApi } from '~/composables/useHousesApi';
import { useUserStore } from '~/stores/user';
import { useNotificationStore } from '~/stores/notifications';
import { useHousesStore } from '~/stores/houses';
import { createMockHouse, createMockHouseMember } from '~/tests/utils';

vi.mock('~/composables/useHousesApi', () => ({ useHousesApi: vi.fn() }));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

describe('useHousesStore', () => {
  let mockHousesApi: {
    getCurrentHouse: ReturnType<typeof vi.fn>;
    getHouse: ReturnType<typeof vi.fn>;
    getHouseMembers: ReturnType<typeof vi.fn>;
    createHouse: ReturnType<typeof vi.fn>;
    updateHouse: ReturnType<typeof vi.fn>;
    deleteHouse: ReturnType<typeof vi.fn>;
    leaveHouse: ReturnType<typeof vi.fn>;
    archiveHouse: ReturnType<typeof vi.fn>;
    inviteUser: ReturnType<typeof vi.fn>;
    removeMember: ReturnType<typeof vi.fn>;
    switchHouse: ReturnType<typeof vi.fn>;
  };
  let mockNotificationStore: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockHousesApi = {
      getCurrentHouse: vi.fn(),
      getHouse: vi.fn(),
      getHouseMembers: vi.fn(),
      createHouse: vi.fn(),
      updateHouse: vi.fn(),
      deleteHouse: vi.fn(),
      leaveHouse: vi.fn(),
      archiveHouse: vi.fn(),
      inviteUser: vi.fn(),
      removeMember: vi.fn(),
      switchHouse: vi.fn(),
    };
    mockNotificationStore = { addNotification: vi.fn() };

    vi.mocked(useHousesApi).mockReturnValue(mockHousesApi as any);
    vi.mocked(useUserStore).mockReturnValue({
      currentUser: { id: 'test-user-id' },
    } as any);
    vi.mocked(useNotificationStore).mockReturnValue(
      mockNotificationStore as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with null currentHouse', () => {
      const store = useHousesStore();
      expect(store.currentHouse).toBeNull();
    });

    it('initializes with empty members array', () => {
      const store = useHousesStore();
      expect(store.members).toEqual([]);
    });

    it('initializes with null lastFetch', () => {
      const store = useHousesStore();
      expect(store.lastFetch).toBeNull();
    });
  });

  describe('computed: isOwner', () => {
    it('returns true when currentUser.id equals currentHouse.owner_id', async () => {
      const house = createMockHouse({ owner_id: 'test-user-id' });
      mockHousesApi.getCurrentHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.isOwner).toBe(true);
    });

    it('returns false when currentUser.id differs from currentHouse.owner_id', async () => {
      const house = createMockHouse({ owner_id: 'other-user-id' });
      mockHousesApi.getCurrentHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.isOwner).toBe(false);
    });
  });

  describe('computed: activeMembers and memberCount', () => {
    it('filters out members with left_at', async () => {
      const activeMember = createMockHouseMember({
        user_id: 'u1',
        left_at: null,
      });
      const leftMember = createMockHouseMember({
        user_id: 'u2',
        left_at: '2024-01-01',
      });
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([
        activeMember,
        leftMember,
      ]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.activeMembers).toHaveLength(1);
      expect(store.memberCount).toBe(1);
    });
  });

  describe('loadCurrentHouse', () => {
    it('sets currentHouse and loads members', async () => {
      const house = createMockHouse();
      const members = [createMockHouseMember()];
      mockHousesApi.getCurrentHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue(members);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.currentHouse).toEqual(house);
      expect(store.members).toEqual(members);
      expect(store.lastFetch).toBeInstanceOf(Date);
    });

    it('sets currentHouse to null and clears members when API returns null', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(null);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.currentHouse).toBeNull();
      expect(store.members).toEqual([]);
    });
  });

  describe('createHouse', () => {
    const validData = { name: 'My House', currency: 'EUR' };

    it('creates house and sets it as currentHouse', async () => {
      const newHouse = createMockHouse({ id: 'new-house' });
      mockHousesApi.createHouse.mockResolvedValue(newHouse);
      const store = useHousesStore();
      const result = await store.createHouse(validData);
      expect(result).toBe(true);
      expect(store.currentHouse).toEqual(newHouse);
    });

    it('returns false and notifies when name is empty', async () => {
      const store = useHousesStore();
      const result = await store.createHouse({ name: '  ', currency: 'EUR' });
      expect(result).toBe(false);
      expect(mockHousesApi.createHouse).not.toHaveBeenCalled();
    });

    it('returns false and notifies when currency is empty', async () => {
      const store = useHousesStore();
      const result = await store.createHouse({ name: 'House', currency: '' });
      expect(result).toBe(false);
      expect(mockHousesApi.createHouse).not.toHaveBeenCalled();
    });

    it('returns false and notifies when API returns null', async () => {
      mockHousesApi.createHouse.mockResolvedValue(null);
      const store = useHousesStore();
      const result = await store.createHouse(validData);
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('forwards max_members through to the API call', async () => {
      const newHouse = createMockHouse({ id: 'new-house', max_members: 4 });
      mockHousesApi.createHouse.mockResolvedValue(newHouse);
      const store = useHousesStore();
      await store.createHouse({ ...validData, max_members: 4 });
      expect(mockHousesApi.createHouse).toHaveBeenCalledWith(
        expect.objectContaining({ max_members: 4 }),
      );
    });
  });

  describe('inviteUser', () => {
    beforeEach(async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      mockNotificationStore.addNotification.mockClear();
    });

    it('returns false and notifies when no current house', async () => {
      const store = useHousesStore();
      // Reset clears currentHouse back to null
      store.reset();
      const result = await store.inviteUser('user@example.com');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledTimes(1);
    });

    it('returns false and notifies when email has no @', async () => {
      const store = useHousesStore();
      const result = await store.inviteUser('notanemail');
      expect(result).toBe(false);
      expect(mockHousesApi.inviteUser).not.toHaveBeenCalled();
    });

    it('invites user and notifies on success', async () => {
      mockHousesApi.inviteUser.mockResolvedValue(true);
      const store = useHousesStore();
      const result = await store.inviteUser('user@example.com');
      expect(result).toBe(true);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteHouse', () => {
    it('clears state on success', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.deleteHouse.mockResolvedValue(true);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.deleteHouse();
      expect(result).toBe(true);
      expect(store.currentHouse).toBeNull();
      expect(store.members).toEqual([]);
    });

    it('returns false when no house is loaded', async () => {
      const store = useHousesStore();
      const result = await store.deleteHouse();
      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears currentHouse, members and lastFetch', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([
        createMockHouseMember(),
      ]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      store.reset();
      expect(store.currentHouse).toBeNull();
      expect(store.members).toEqual([]);
      expect(store.lastFetch).toBeNull();
    });
  });

  describe('computed: isMember', () => {
    it('returns true when currentUser is an active member', async () => {
      const member = createMockHouseMember({
        user_id: 'test-user-id',
        left_at: null,
      });
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([member]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.isMember).toBe(true);
    });

    it('returns false when currentUser has left', async () => {
      const member = createMockHouseMember({
        user_id: 'test-user-id',
        left_at: '2024-01-01',
      });
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([member]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.isMember).toBe(false);
    });
  });

  describe('loadHouse', () => {
    it('loads house and members by id', async () => {
      const house = createMockHouse({ id: 'h-99' });
      const members = [createMockHouseMember()];
      mockHousesApi.getHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue(members);
      const store = useHousesStore();
      await store.loadHouse('h-99');
      expect(store.currentHouse).toEqual(house);
      expect(store.members).toEqual(members);
    });

    it('adds error notification when house not found', async () => {
      mockHousesApi.getHouse.mockResolvedValue(null);
      const store = useHousesStore();
      await store.loadHouse('nonexistent');
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('updateHouse', () => {
    it('returns false and notifies when no current house', async () => {
      const store = useHousesStore();
      const result = await store.updateHouse({ name: 'New Name' });
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('updates house and notifies on success', async () => {
      const original = createMockHouse({ name: 'Old' });
      const updated = createMockHouse({ name: 'New' });
      mockHousesApi.getCurrentHouse.mockResolvedValue(original);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.updateHouse.mockResolvedValue(updated);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.updateHouse({ name: 'New' });
      expect(result).toBe(true);
      expect(store.currentHouse).toEqual(updated);
    });

    it('returns false and notifies when API returns null', async () => {
      const house = createMockHouse();
      mockHousesApi.getCurrentHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.updateHouse.mockResolvedValue(null);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.updateHouse({ name: 'New' });
      expect(result).toBe(false);
      // The house page shows the failure inside the edit form instead.
      expect(mockNotificationStore.addNotification).not.toHaveBeenCalledWith(
        'error',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('updates the named house without replacing a different current house', async () => {
      const current = createMockHouse({ id: 'current' });
      const other = createMockHouse({ id: 'other', name: 'Other' });
      mockHousesApi.getCurrentHouse.mockResolvedValue(current);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.updateHouse.mockResolvedValue(other);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(await store.updateHouse({ name: 'Other' }, 'other')).toBe(true);
      expect(mockHousesApi.updateHouse).toHaveBeenCalledWith('other', {
        name: 'Other',
      });
      expect(store.currentHouse?.id).toBe('current');
    });
  });

  describe('leaveHouse', () => {
    it('returns false and notifies when no current house', async () => {
      const store = useHousesStore();
      const result = await store.leaveHouse();
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });

    it('clears state and notifies on success', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.leaveHouse.mockResolvedValue(true);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.leaveHouse();
      expect(result).toBe(true);
      expect(store.currentHouse).toBeNull();
    });

    it('returns false when API returns false', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.leaveHouse.mockResolvedValue(false);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.leaveHouse();
      expect(result).toBe(false);
    });
  });

  describe('archiveHouse', () => {
    it('clears the current house on success', async () => {
      const house = createMockHouse();
      mockHousesApi.getCurrentHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.archiveHouse.mockResolvedValue(true);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.archiveHouse(house.id);
      expect(result).toBe(true);
      expect(mockHousesApi.archiveHouse).toHaveBeenCalledWith(house.id);
      expect(store.currentHouse).toBeNull();
    });

    it('keeps state and notifies when the API fails', async () => {
      const house = createMockHouse();
      mockHousesApi.getCurrentHouse.mockResolvedValue(house);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.archiveHouse.mockResolvedValue(false);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.archiveHouse(house.id);
      expect(result).toBe(false);
      expect(store.currentHouse).not.toBeNull();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        'errors.generic',
        'errors.failedToSave',
        { i18n: true },
      );
    });
  });

  describe('deleteHouse failure', () => {
    it('returns false and notifies when API returns false', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.deleteHouse.mockResolvedValue(false);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.deleteHouse();
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('removeMember', () => {
    it('returns false when no current house', async () => {
      const store = useHousesStore();
      const result = await store.removeMember('u-1');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });

    it('removes member successfully and reloads members', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.removeMember.mockResolvedValue(true);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.removeMember('u-1');
      expect(result).toBe(true);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('returns false when API returns false', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      mockHousesApi.removeMember.mockResolvedValue(false);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      const result = await store.removeMember('u-1');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('getHouseNames', () => {
    it('maps ids to names and skips unresolvable ones', async () => {
      mockHousesApi.getHouse
        .mockResolvedValueOnce(createMockHouse({ id: 'h1', name: 'Casa' }))
        .mockResolvedValueOnce(null);
      const out = await useHousesStore().getHouseNames(['h1', 'h2']);
      expect(out).toEqual([{ id: 'h1', name: 'Casa' }]);
    });

    it('returns [] instead of throwing', async () => {
      mockHousesApi.getHouse.mockRejectedValue(new Error('x'));
      expect(await useHousesStore().getHouseNames(['h1'])).toEqual([]);
    });
  });

  describe('switchHouse', () => {
    it('switches house successfully', async () => {
      const newHouse = createMockHouse();
      mockHousesApi.switchHouse.mockResolvedValue(newHouse);
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      const result = await store.switchHouse('h-new');
      expect(result).toBe(true);
      expect(store.currentHouse).toEqual(newHouse);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('returns false when API returns null', async () => {
      mockHousesApi.switchHouse.mockResolvedValue(null);
      const store = useHousesStore();
      const result = await store.switchHouse('h-nonexistent');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('initialize', () => {
    it('loads current house when no data exists', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      await store.initialize();
      expect(store.currentHouse).not.toBeNull();
    });

    it('skips load when house already loaded and not forced', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      mockHousesApi.getCurrentHouse.mockClear();
      await store.initialize();
      expect(mockHousesApi.getCurrentHouse).not.toHaveBeenCalled();
    });

    it('force-refreshes when forceRefresh=true even if house loaded', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue([]);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      mockHousesApi.getCurrentHouse.mockClear();
      await store.initialize(true);
      expect(mockHousesApi.getCurrentHouse).toHaveBeenCalled();
    });
  });

  describe('loadHouseMembers null branch', () => {
    it('sets members to empty array when API returns null', async () => {
      mockHousesApi.getCurrentHouse.mockResolvedValue(createMockHouse());
      mockHousesApi.getHouseMembers.mockResolvedValue(null);
      const store = useHousesStore();
      await store.loadCurrentHouse();
      expect(store.members).toEqual([]);
    });
  });
});
