<script lang="ts" setup>
import { yourMonth } from '~/utils/homeFigures';

const { t: $t } = useI18n();

useSeoMeta({
  title: $t('seo.titles.houseDetails'),
});

const billsStore = useBillsStore();
const userStore = useUserStore();

const {
  house,
  loading,
  error,
  showInvitationModal,
  editError,
  inviteLoading,
  inviteError,
  roleLoading,
  memberActionError,
  memberActionUserId,
  isOwner,
  isCurrentUserOwner,
  canViewHouse,
  activeMembers,
  canInviteMembers,
  enableInvitation,
  isFull,
  ownerMember,
  showLeaveModal,
  showArchiveConfirm,
  archiveLoading,
  handleLeft,
  handleArchiveHouse,
  loadHouseDetails,
  handleEditHouse,
  navigateToUser,
  handleRoleUpdate,
  handleTransferOwnership,
  handleRemoveMember,
  handleInviteMember,
} = useHouseDetailsPage();

const { summary, balance } = useHouseSummary(
  house,
  computed(() => activeMembers.value.length),
  canViewHouse,
);

const expensesStore = useExpensesStore();
onMounted(() => expensesStore.initialize());

// The dashboard's own figure for the user's cost this month.
const month = computed(() =>
  yourMonth({
    bills: billsStore.bills,
    expenses: expensesStore.expenses,
    userId: userStore.currentUser?.id,
    memberCount: activeMembers.value.length,
  }),
);
const myBalance = computed(() => {
  const mine = balance.value?.user_balances.find(
    (b) => b.user_id === userStore.currentUser?.id,
  );
  return balance.value ? (mine?.net_balance ?? 0) : null;
});
const ownerName = computed(() => {
  const u = ownerMember.value?.user;
  return `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
});

// Each section shows its own save failure, never the other's.
const keyFactsError = ref('');
const descriptionError = ref('');
const saveSection = async (
  target: Ref<string>,
  updates: Parameters<typeof handleEditHouse>[0],
) => {
  target.value = '';
  const saved = await handleEditHouse(updates);
  if (!saved) target.value = editError.value;
  return saved;
};

// Templates unwrap refs, so the refs are bound here, not in the template.
const saveKeyFacts = (updates: Parameters<typeof handleEditHouse>[0]) =>
  saveSection(keyFactsError, updates);
const saveDescription = (description: string | null) =>
  saveSection(descriptionError, { description });

const dangerZone = ref<{ focusLeave: () => void } | null>(null);
const closeLeaveModal = async () => {
  showLeaveModal.value = false;
  await nextTick();
  dangerZone.value?.focusLeave();
};

const joinCode = useHouseJoinCode(
  () => house.value?.id,
  () => !!enableInvitation.value,
);
</script>

<template>
  <AppPageHeader :title="house?.name || $t('houseProfile.title')" />

  <UiContainer v-if="loading" class="space-y-6" role="status">
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <UiCard aria-hidden="true">
      <UiSkeleton class="h-5 w-full max-w-md" />
    </UiCard>
    <UiCard aria-hidden="true">
      <UiSkeleton class="h-5 w-32" />
      <ul class="mt-4 space-y-4">
        <li v-for="n in 3" :key="n" class="flex items-center gap-3">
          <UiSkeleton class="size-10 shrink-0 rounded-full" />
          <UiSkeleton class="h-4 w-40" />
        </li>
      </ul>
    </UiCard>
  </UiContainer>

  <UiContainer v-else-if="error">
    <UiCard class="text-center">
      <div
        class="inline-flex items-center justify-center size-12 rounded-full bg-danger-subtle"
      >
        <Icon
          name="heroicons:exclamation-triangle"
          class="size-6 text-danger-fg"
          aria-hidden="true"
        />
      </div>
      <h2 class="text-lg font-semibold text-fg">
        {{ $t('houseProfile.loadErrorTitle') }}
      </h2>
      <p class="text-fg-muted">{{ error }}</p>
      <div class="flex flex-wrap justify-center gap-2">
        <UiButton icon="arrow-path" @click="loadHouseDetails">
          {{ $t('common.retry') }}
        </UiButton>
        <UiLinkButton to="/dashboard" variant="secondary">
          {{ $t('common.goHome') }}
        </UiLinkButton>
      </div>
    </UiCard>
  </UiContainer>

  <UiContainer v-else-if="house && !canViewHouse">
    <UiCard class="text-center">
      <div
        class="inline-flex items-center justify-center size-12 rounded-full bg-surface-hover"
      >
        <Icon
          name="heroicons:lock-closed"
          class="size-6 text-fg-muted"
          aria-hidden="true"
        />
      </div>
      <h2 class="text-lg font-semibold text-fg">
        {{ $t('houseProfile.accessDeniedTitle') }}
      </h2>
      <p class="text-fg-muted">
        {{ $t('houseProfile.accessDenied') }}
      </p>
      <UiLinkButton to="/dashboard">
        {{ $t('common.goHome') }}
      </UiLinkButton>
    </UiCard>
  </UiContainer>

  <UiContainer v-else-if="house && canViewHouse" class="space-y-6">
    <HouseInformationCard
      :is-owner="!!isOwner"
      :summary="summary"
      :can-invite="!!enableInvitation"
      :can-manage-members="canInviteMembers"
      :is-full="isFull"
      @invite="showInvitationModal = true"
    />

    <HouseKeyFacts
      :house="house"
      :is-owner="!!isOwner"
      :owner-name="ownerName"
      :owner-id="ownerMember?.user_id"
      :active-count="activeMembers.length"
      :error="keyFactsError"
      :save="saveKeyFacts"
    />

    <HouseDescriptionCard
      :description="house.description"
      :is-owner="!!isOwner"
      :error="descriptionError"
      :save="saveDescription"
    />

    <HouseMoneySnapshot
      :currency="house.currency"
      :month-total="month.total"
      :balance="myBalance"
    />

    <HouseMembersCard
      :members="activeMembers"
      :role-loading="roleLoading"
      :action-error="memberActionError"
      :action-error-user-id="memberActionUserId"
      :balances="balance?.user_balances ?? null"
      :currency="house.currency"
      :is-current-user-owner="isCurrentUserOwner"
      :current-user-id="userStore.currentUser?.id"
      @user-click="navigateToUser"
      @remove-member="handleRemoveMember"
      @update-role="handleRoleUpdate"
      @transfer-ownership="handleTransferOwnership"
    />

    <HouseBillsPreview :bills="billsStore.bills" />

    <HouseDangerZone
      ref="dangerZone"
      :is-owner="!!isOwner"
      @leave="showLeaveModal = true"
      @archive="showArchiveConfirm = true"
    />
  </UiContainer>

  <HouseInvitationModal
    :show="showInvitationModal"
    :invite-loading="inviteLoading"
    :action-error="inviteError"
    :join-code="joinCode.joinCode.value"
    :join-code-loading="joinCode.loading.value"
    :join-code-generating="joinCode.generating.value"
    :join-code-has-error="joinCode.hasError.value"
    @close="showInvitationModal = false"
    @invite-member="handleInviteMember"
    @generate-code="joinCode.generate"
    @copy-code="joinCode.copy"
  />

  <UserLeaveHouseModal
    v-if="showLeaveModal && house"
    :house-id="house.id"
    :house-name="house.name"
    :is-owner="!!isOwner"
    @close="closeLeaveModal"
    @left="handleLeft"
  />

  <UiConfirmModal
    :show="showArchiveConfirm"
    :title="$t('houseProfile.archive.title')"
    :message="$t('houseProfile.archive.message')"
    :confirm-text="$t('houseProfile.archive.confirm')"
    confirm-variant="danger"
    :loading="archiveLoading"
    @confirm="handleArchiveHouse"
    @cancel="showArchiveConfirm = false"
    @close="showArchiveConfirm = false"
  />
</template>
