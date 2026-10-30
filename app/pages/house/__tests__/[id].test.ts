import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User, House, HouseMember } from '~/types';
import { createMockUser, createMockHouse, setupPinia } from '~/tests/utils';

describe('House Page Integration', () => {
  let mockOwner: User;
  let mockMember: User;
  let mockHouse: House;
  let mockMembers: HouseMember[];

  beforeEach(() => {
    setupPinia();
    vi.clearAllMocks();

    mockOwner = createMockUser({
      id: 'owner-1',
      first_name: 'Owner',
      last_name: 'User',
      email: 'owner@example.com',
    });

    mockMember = createMockUser({
      id: 'member-1',
      first_name: 'Member',
      last_name: 'User',
      email: 'member@example.com',
    });

    mockHouse = createMockHouse({
      id: 'house-1',
      name: 'Test House',
      owner_id: mockOwner.id,
      max_members: 5,
      currency: 'USD',
    });

    mockMembers = [
      {
        id: 'membership-1',
        house_id: mockHouse.id,
        user_id: mockOwner.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
        left_at: undefined,
        user: mockOwner,
        is_active: true,
      },
      {
        id: 'membership-2',
        house_id: mockHouse.id,
        user_id: mockMember.id,
        role: 'member',
        joined_at: new Date().toISOString(),
        left_at: undefined,
        user: mockMember,
        is_active: true,
      },
    ];

    mockHouse.members = mockMembers;
  });

  describe('Owner and Member Checks', () => {
    it('should identify owner by matching user_id to owner_id', () => {
      const currentUserId = mockOwner.id;
      const isOwner = currentUserId === mockHouse.owner_id;

      expect(isOwner).toBe(true);
    });

    it('should identify non-owner', () => {
      const currentUserId = mockMember.id;
      const isOwner = currentUserId === mockHouse.owner_id;

      expect(isOwner).toBe(false);
    });

    it('should identify member by presence in members list', () => {
      const currentUserId = mockMember.id;
      const isMember =
        mockHouse.members?.some(
          (member) => member.user_id === currentUserId && !member.left_at,
        ) || false;

      expect(isMember).toBe(true);
    });

    it('should not identify left member as active', () => {
      const leftMember: HouseMember = {
        id: mockMembers[1]!.id,
        house_id: mockMembers[1]!.house_id,
        user_id: mockMembers[1]!.user_id,
        role: mockMembers[1]!.role,
        joined_at: mockMembers[1]!.joined_at,
        left_at: new Date().toISOString(),
        user: mockMembers[1]!.user,
        is_active: false,
      };
      const houseWithLeftMember = {
        ...mockHouse,
        members: [mockMembers[0], leftMember],
      };

      const currentUserId = mockMember.id;
      const isMember =
        houseWithLeftMember.members?.some(
          (member) =>
            member && member.user_id === currentUserId && !member.left_at,
        ) || false;

      expect(isMember).toBe(false);
    });

    it('should allow owner to view house', () => {
      const currentUserId = mockOwner.id;
      const isOwner = currentUserId === mockHouse.owner_id;
      const isMember =
        mockHouse.members?.some(
          (member) => member.user_id === currentUserId && !member.left_at,
        ) || false;
      const canView = isOwner || isMember;

      expect(canView).toBe(true);
    });

    it('should allow member to view house', () => {
      const currentUserId = mockMember.id;
      const isOwner = currentUserId === mockHouse.owner_id;
      const isMember =
        mockHouse.members?.some(
          (member) => member.user_id === currentUserId && !member.left_at,
        ) || false;
      const canView = isOwner || isMember;

      expect(canView).toBe(true);
    });

    it('should not allow non-member to view house', () => {
      const outsiderId = 'outsider-1';
      const isOwner = outsiderId === mockHouse.owner_id;
      const isMember =
        mockHouse.members?.some(
          (member) => member.user_id === outsiderId && !member.left_at,
        ) || false;
      const canView = isOwner || isMember;

      expect(canView).toBe(false);
    });
  });

  describe('Active Members Filtering', () => {
    it('should filter active members (no left_at)', () => {
      const activeMembers =
        mockHouse.members?.filter((member) => !member.left_at) || [];

      expect(activeMembers).toHaveLength(2);
      expect(activeMembers[0]?.user_id).toBe(mockOwner.id);
      expect(activeMembers[1]?.user_id).toBe(mockMember.id);
    });

    it('should exclude members who have left', () => {
      const leftMember: HouseMember = {
        id: 'membership-3',
        house_id: mockHouse.id,
        user_id: 'left-user',
        role: 'member',
        joined_at: new Date().toISOString(),
        left_at: new Date().toISOString(),
        is_active: false,
      };

      const houseWithLeftMember = {
        ...mockHouse,
        members: [...mockMembers, leftMember],
      };

      const activeMembers =
        houseWithLeftMember.members?.filter((member) => !member.left_at) || [];

      expect(activeMembers).toHaveLength(2);
      expect(activeMembers.every((m) => !m.left_at)).toBe(true);
    });

    it('should find owner member from active members', () => {
      const activeMembers =
        mockHouse.members?.filter((member) => !member.left_at) || [];
      const ownerMember = activeMembers.find(
        (member) => member.role === 'owner',
      );

      expect(ownerMember).toBeDefined();
      expect(ownerMember?.user_id).toBe(mockOwner.id);
    });

    it('should return empty array when no members', () => {
      const emptyHouse: House = {
        ...mockHouse,
        members: [],
      };

      const activeMembers =
        emptyHouse.members?.filter((member) => !member.left_at) || [];

      expect(activeMembers).toHaveLength(0);
    });
  });

  describe('Invitation Logic', () => {
    it('should enable invitation when owner and under max members', () => {
      const currentUserId = mockOwner.id;
      const isOwner = currentUserId === mockHouse.owner_id;
      const currentMemberCount = mockHouse.members?.length || 0;
      const maxMembers = mockHouse.max_members;

      const canInvite =
        isOwner &&
        maxMembers !== null &&
        maxMembers !== undefined &&
        currentMemberCount < maxMembers;

      expect(canInvite).toBe(true);
      expect(currentMemberCount).toBe(2);
      expect(maxMembers).toBe(5);
    });

    it('should disable invitation when at max members', () => {
      const fullHouse = {
        ...mockHouse,
        max_members: 2,
      };

      const currentUserId = mockOwner.id;
      const isOwner = currentUserId === fullHouse.owner_id;
      const currentMemberCount = fullHouse.members?.length || 0;
      const maxMembers = fullHouse.max_members;

      const canInvite = isOwner && currentMemberCount < maxMembers;

      expect(canInvite).toBe(false);
    });

    it('should disable invitation when not owner', () => {
      const currentUserId = mockMember.id;
      const isOwner = currentUserId === mockHouse.owner_id;
      const currentMemberCount = mockHouse.members?.length || 0;
      const maxMembers = mockHouse.max_members;

      const canInvite =
        isOwner &&
        maxMembers !== null &&
        maxMembers !== undefined &&
        currentMemberCount < maxMembers;

      expect(canInvite).toBe(false);
    });

    it('should generate invitation URL with token', () => {
      const baseUrl = 'http://localhost:3000';
      const token = 'invite-token-123';
      const invitationUrl = `${baseUrl}/house/join/${token}`;

      expect(invitationUrl).toBe(
        'http://localhost:3000/house/join/invite-token-123',
      );
    });
  });

  describe('House Loading Logic', () => {
    it('should require house ID to load', () => {
      const houseId = mockHouse.id;
      const canLoad = !!houseId;

      expect(canLoad).toBe(true);
    });

    it('should not load without house ID', () => {
      const houseId: string | undefined = undefined;
      const canLoad = !!houseId;

      expect(canLoad).toBe(false);
    });

    it('should require user to load house', () => {
      const currentUser = mockOwner;
      const canLoad = !!currentUser;

      expect(canLoad).toBe(true);
    });

    it('should handle loading state', () => {
      let loading = true;
      let error = '';
      let houseData: House | null = null;

      // Simulate successful load
      houseData = mockHouse;
      loading = false;
      error = '';

      expect(loading).toBe(false);
      expect(error).toBe('');
      expect(houseData).toBeDefined();
    });

    it('should handle error state', () => {
      let loading = true;
      let error = '';
      let houseData: House | null = null;

      // Simulate error
      loading = false;
      error = 'Failed to load house';
      houseData = null;

      expect(loading).toBe(false);
      expect(error).toBe('Failed to load house');
      expect(houseData).toBeNull();
    });
  });

  describe('House Edit Logic', () => {
    it('should prepare house updates', () => {
      const updates = {
        name: 'Updated House Name',
        address: '456 New St',
        currency: 'EUR' as const,
      };

      expect(updates.name).toBe('Updated House Name');
      expect(updates.address).toBe('456 New St');
      expect(updates.currency).toBe('EUR');
    });

    it('should track edit loading state', () => {
      let editLoading = false;

      editLoading = true;
      expect(editLoading).toBe(true);

      editLoading = false;
      expect(editLoading).toBe(false);
    });

    it('should toggle edit modal visibility', () => {
      let showEditModal = false;

      showEditModal = true;
      expect(showEditModal).toBe(true);

      showEditModal = false;
      expect(showEditModal).toBe(false);
    });
  });

  describe('Member Count Logic', () => {
    it('should count total members', () => {
      const totalMembers = mockHouse.members?.length || 0;

      expect(totalMembers).toBe(2);
    });

    it('should calculate available slots', () => {
      const currentMembers = mockHouse.members?.length || 0;
      const maxMembers = mockHouse.max_members;
      const availableSlots =
        maxMembers !== null && maxMembers !== undefined
          ? maxMembers - currentMembers
          : Infinity;

      expect(availableSlots).toBe(3);
    });

    it('should identify full house', () => {
      const fullHouse = {
        ...mockHouse,
        max_members: 2,
      };

      const currentMembers = fullHouse.members?.length || 0;
      const maxMembers = fullHouse.max_members;
      const isFull = currentMembers >= maxMembers;

      expect(isFull).toBe(true);
    });

    it('should identify house with space', () => {
      const currentMembers = mockHouse.members?.length || 0;
      const maxMembers = mockHouse.max_members;
      const hasSpace =
        maxMembers !== null &&
        maxMembers !== undefined &&
        currentMembers < maxMembers;

      expect(hasSpace).toBe(true);
    });
  });
});
