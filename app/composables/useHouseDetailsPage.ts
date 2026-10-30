import type { House } from '~/types';

/**
 * Owns the /house/[id] page's state and actions: loading the house (with
 * its members) and bills, ownership/membership checks, the edit-house flow,
 * the invitation-generation flow, and member role updates. Extracted from
 * [id].vue so the page's script stays focused on rendering the resulting
 * states.
 *
 * Note: house loading goes through `useHouses().getHouseWithMembers()`
 * rather than the houses store — a known duplicate data path, not fixed
 * here.
 */
export function useHouseDetailsPage() {
  const { t: $t } = useI18n();
  const route = useRoute();
  const housesComposable = useHouses();
  const housesStore = useHousesStore();
  const billsStore = useBillsStore();
  const userStore = useUserStore();
  const notificationStore = useNotificationStore();

  const houseId = computed(() => route.params.id as string);

  const house = ref<House | null>(null);
  const loading = ref(true);
  const error = ref('');
  const editLoading = ref(false);
  const editError = ref('');
  const showInvitationModal = ref(false);
  const inviteLoading = ref(false);
  const inviteError = ref('');
  const roleLoading = ref(false);
  const memberActionError = ref('');
  // Whose row the last failed member action belongs to, so the error shows
  // next to that person instead of at the top of the list.
  const memberActionUserId = ref<string | null>(null);

  const memberName = (userId: string) => {
    const user = house.value?.members?.find((m) => m.user_id === userId)?.user;
    return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  };

  const failMemberAction = (userId: string, message: string) => {
    memberActionError.value = message;
    memberActionUserId.value = userId;
  };

  const clearMemberActionError = () => {
    memberActionError.value = '';
    memberActionUserId.value = null;
  };

  const isOwner = computed(() => {
    return (
      userStore.currentUser &&
      house.value &&
      userStore.currentUser.id === house.value.owner_id
    );
  });

  const isCurrentUserOwner = computed(
    () =>
      house.value?.members?.some(
        (m) => m.user_id === userStore.currentUser?.id && m.role === 'owner',
      ) ?? false,
  );

  // Delegates (role 'admin') are authorised by the server's ensureHouseAdmin
  // for both invite paths — the link and the by-email add. The UI gated them
  // on ownership alone, so a delegate had the permission and no control to
  // use it. Role changes and member removal stay owner-only.
  const canInviteMembers = computed(
    () =>
      house.value?.members?.some(
        (m) =>
          m.user_id === userStore.currentUser?.id &&
          (m.role === 'owner' || m.role === 'admin'),
      ) ?? false,
  );

  const isMember = computed(() => {
    if (!userStore.currentUser || !house.value?.members) {
      return false;
    }
    return house.value.members.some(
      (member) =>
        member.user_id === userStore.currentUser?.id && !member.left_at,
    );
  });

  const canViewHouse = computed(() => {
    return isOwner.value || isMember.value;
  });

  const activeMembers = computed(() => {
    if (!house.value?.members) {
      return [];
    }
    return house.value.members.filter((member) => !member.left_at);
  });

  const ownerMember = computed(() => {
    return activeMembers.value.find((member) => member.role === 'owner');
  });

  const isFull = computed(
    () =>
      !!house.value &&
      activeMembers.value.length >= (house.value.max_members ?? 10),
  );

  const enableInvitation = computed(
    () => canInviteMembers.value && !isFull.value,
  );

  const loadHouseDetails = async () => {
    if (!houseId.value) {
      error.value = $t('houseProfile.loadError');
      loading.value = false;
      return;
    }

    if (!userStore.currentUser) {
      loading.value = false;
      return;
    }

    try {
      loading.value = true;
      error.value = '';

      const result = await housesComposable.getHouseWithMembers(houseId.value);
      if (result.data) {
        house.value = result.data;
      } else {
        // Check if it's an auth error
        const isAuthError =
          result.error?.toLowerCase().includes('auth') ||
          result.error?.toLowerCase().includes('unauthorized') ||
          result.error?.toLowerCase().includes('session');

        if (isAuthError) {
          // Don't show auth errors to user, let auth middleware handle it
          return;
        }

        // A fixed sentence with a likely cause, never the server's raw text.
        error.value = $t('houseProfile.loadError');
      }
    } catch {
      error.value = $t('houseProfile.loadError');
    } finally {
      loading.value = false;
    }
  };

  // Load house bills
  const loadHouseBills = async () => {
    if (!house.value?.id) return;

    try {
      await billsStore.loadHouseBills(house.value.id);
    } catch {
      // Silent error handling - bills loading is not critical
    }
  };

  // Save an inline edit. Resolves true when saved; on failure the form stays
  // open, keeping what the owner typed, and shows the error inside it.
  const handleEditHouse = async (updates: Partial<House>): Promise<boolean> => {
    if (!house.value?.id || editLoading.value) return false;
    editError.value = '';
    editLoading.value = true;
    try {
      const saved = await housesStore.updateHouse(updates, house.value.id);
      if (!saved) {
        editError.value = $t('houseProfile.editError');
        return false;
      }
      await loadHouseDetails();
      return true;
    } catch {
      editError.value = $t('houseProfile.editError');
      return false;
    } finally {
      editLoading.value = false;
    }
  };

  const showLeaveModal = ref(false);
  const showArchiveConfirm = ref(false);
  const archiveLoading = ref(false);

  const handleLeft = async () => {
    showLeaveModal.value = false;
    await navigateTo('/dashboard');
  };

  // Owner-only; the server enforces it too. Leaves the page on success.
  const handleArchiveHouse = async () => {
    if (!house.value?.id || archiveLoading.value) return;
    archiveLoading.value = true;
    try {
      const archived = await housesStore.archiveHouse(house.value.id);
      if (!archived) {
        notificationStore.error('common.error', 'houseProfile.archive.error');
        return;
      }
      showArchiveConfirm.value = false;
      await navigateTo('/dashboard');
    } catch {
      notificationStore.error('common.error', 'houseProfile.archive.error');
    } finally {
      archiveLoading.value = false;
    }
  };

  // Navigation helpers
  const navigateToUser = (userId: string) => {
    navigateTo(`/user/${userId}`);
  };

  // Handle member role update. 'owner' is never assigned here: it moves via
  // handleTransferOwnership, since there is exactly one owner per house.
  const handleRoleUpdate = async (userId: string, role: 'admin' | 'member') => {
    if (!house.value) return;
    clearMemberActionError();
    roleLoading.value = true;
    try {
      const result = await housesComposable.updateMemberRole(
        house.value.id,
        userId,
        role,
      );
      if (result.error) {
        failMemberAction(userId, result.error);
        return;
      }
      notificationStore.success(
        $t('houseProfile.roleUpdated'),
        $t('houseProfile.roleUpdatedDesc', {
          name: memberName(userId),
          role: $t(
            role === 'admin'
              ? 'houseProfile.roleAdmin'
              : 'houseProfile.roleMember',
          ),
        }),
      );
      // Reload so the page shows the new role once the modal dismisses.
      await loadHouseDetails();
    } finally {
      roleLoading.value = false;
    }
  };

  // Hand the owner role to another member (irreversible for the caller; the
  // modal has already asked for confirmation). The caller becomes a member.
  const handleTransferOwnership = async (userId: string) => {
    if (!house.value) return;
    clearMemberActionError();
    roleLoading.value = true;
    try {
      const result = await housesComposable.transferOwnership(
        house.value.id,
        userId,
      );
      if (result.error) {
        failMemberAction(userId, result.error);
        return;
      }
      notificationStore.success(
        'houseProfile.ownershipTransferredTitle',
        'houseProfile.ownershipTransferredDesc',
        { i18n: true },
      );
      await loadHouseDetails();
    } finally {
      roleLoading.value = false;
    }
  };

  // Handle member removal (owner-only; enforced server-side too)
  const handleRemoveMember = async (userId: string) => {
    if (!house.value) return;
    clearMemberActionError();
    const name = memberName(userId);
    const result = await housesComposable.removeMember(house.value.id, userId);
    if (result.error) {
      failMemberAction(userId, result.error);
      return;
    }
    notificationStore.success(
      $t('houseProfile.memberRemovedTitle'),
      $t('houseProfile.memberRemovedDesc', { name }),
    );
    await loadHouseDetails();
  };

  // Handle inviting a member by email (sends an invitation; the invitee is not added until they accept)
  const handleInviteMember = async (email: string) => {
    if (!house.value) return;
    inviteError.value = '';
    try {
      inviteLoading.value = true;
      const result = await housesComposable.inviteMember(house.value.id, email);
      if (result.error) {
        inviteError.value = result.error;
        return;
      }
      // The invitee joins only after accepting, so the member list is unchanged.
      notificationStore.success(
        'houseProfile.inviteSentTitle',
        'houseProfile.inviteSentDesc',
        { i18n: true },
      );
    } finally {
      inviteLoading.value = false;
    }
  };

  // Wait for user authentication before loading data. Data load is driven
  // by this watcher (with immediate: true) — no onMounted needed.
  watch(
    () => userStore.currentUser,
    async (newUser) => {
      if (newUser) {
        await loadHouseDetails();
        if (house.value) {
          await loadHouseBills();
        }
      }
    },
    { immediate: true },
  );

  return {
    house,
    loading,
    error,
    editLoading,
    showLeaveModal,
    showArchiveConfirm,
    archiveLoading,
    handleLeft,
    handleArchiveHouse,
    editError,
    showInvitationModal,
    inviteLoading,
    inviteError,
    roleLoading,
    memberActionError,
    memberActionUserId,
    isOwner,
    isCurrentUserOwner,
    canInviteMembers,
    canViewHouse,
    activeMembers,
    ownerMember,
    enableInvitation,
    isFull,
    loadHouseDetails,
    handleEditHouse,
    navigateToUser,
    handleRoleUpdate,
    handleTransferOwnership,
    handleRemoveMember,
    handleInviteMember,
  };
}
