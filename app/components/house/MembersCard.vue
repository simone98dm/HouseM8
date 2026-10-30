<script lang="ts" setup>
import type { Currency, HouseMember } from '~/types';
import type { UserBalance } from '~/types/composables/balance';
import type { UiOverflowMenuItem } from '~/components/ui/OverflowMenu.vue';

interface HouseMembersCardProps {
  members: HouseMember[];
  roleLoading?: boolean;
  actionError?: string | null;
  /** The member the error belongs to; it shows under their row. */
  actionErrorUserId?: string | null;
  /** House balances, to say what removing someone leaves behind. */
  balances?: UserBalance[] | null;
  currency?: string;
  isCurrentUserOwner?: boolean;
  currentUserId?: string;
}

interface HouseMembersCardEvents {
  'user-click': [userId: string];
  'remove-member': [userId: string];
  'update-role': [userId: string, role: 'admin' | 'member'];
  'transfer-ownership': [userId: string];
}

const {
  members,
  roleLoading = false,
  actionError = null,
  actionErrorUserId = null,
  balances = null,
  currency = 'EUR',
  isCurrentUserOwner = false,
  currentUserId,
} = defineProps<HouseMembersCardProps>();

const emit = defineEmits<HouseMembersCardEvents>();

const { t } = useI18n();
const { formatMonthYear } = useDate();
const { formatAmount } = useCurrency();

const formatDate = (dateString: string): string =>
  formatMonthYear(dateString, { style: 'short' });

// Ownership is not one of the roles on offer: there is exactly one owner, so
// it moves rather than being granted, and the owner loses control. It gets
// its own danger item ("Transfer ownership…") set apart from the role
// changes, then the same confirm modal, which routes it to the transfer
// endpoint.
type AssignableRole = HouseMember['role'];
const ROLE_OPTIONS: AssignableRole[] = ['admin', 'member'];
const pendingRoleChange = ref<{
  userId: string;
  role: AssignableRole;
} | null>(null);
const pendingRemoval = ref<{ userId: string; memberName: string } | null>(null);

// One place that knows all three roles. The badge previously branched on
// owner-vs-else, so a delegate was labelled "Member" — the role changed in the
// database and the UI kept showing the old one.
const roleLabel = (role: string) => {
  if (role === 'owner') return t('houseProfile.roleOwner');
  if (role === 'admin') return t('houseProfile.roleAdmin');
  return t('houseProfile.roleMember');
};

const memberName = (member: HouseMember | undefined) =>
  `${member?.user?.first_name ?? ''} ${member?.user?.last_name ?? ''}`.trim();

// One menu per member: the other role (confirmed before it applies), then
// the two actions that can't be taken back. The current role is the badge,
// so it is not offered again.
const memberActionItems = (current: string): UiOverflowMenuItem[] => [
  ...ROLE_OPTIONS.filter((role) => role !== current).map((role) => ({
    key: role,
    label: t('houseProfile.changeRoleTo', { role: roleLabel(role) }),
    description:
      role === 'admin' ? t('houseProfile.roleAdminDescription') : undefined,
  })),
  {
    key: 'transfer',
    label: t('houseProfile.transferOwnershipAction'),
    description: t('houseProfile.transferOwnershipHint'),
    danger: true,
  },
  { key: 'remove', label: t('houseProfile.removeFromHouse'), danger: true },
];

const handleMemberAction = (userId: string, action: string) => {
  if (action === 'remove') requestMemberRemoval(userId);
  else if (action === 'transfer') handleRoleChange(userId, 'owner');
  else handleRoleChange(userId, action as AssignableRole);
};

// Below a cent the member is square.
const SQUARE_THRESHOLD = 0.01;

// What removing someone leaves behind: removal doesn't touch the ledger, so
// a debt or credit stays in the house balance after they lose access.
const removalBalanceNote = computed(() => {
  const userId = pendingRemoval.value?.userId;
  const net = balances?.find((b) => b.user_id === userId)?.net_balance ?? 0;
  if (Math.abs(net) < SQUARE_THRESHOLD) return '';
  const params = {
    name: pendingRemoval.value?.memberName ?? '',
    amount: formatAmount(Math.abs(net), currency as Currency),
  };
  return net < 0
    ? t('houseProfile.removeMemberOwes', params)
    : t('houseProfile.removeMemberOwed', params);
});

const sortedMembers = computed(() =>
  [...members].sort(
    (a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'),
  ),
);

// Every role change is confirmed, in both directions: promoting and demoting
// both alter what someone can do to a shared ledger.
const handleRoleChange = (userId: string, role: AssignableRole) => {
  const member = members.find((m) => m.user_id === userId);
  if (!member || member.role === role) return;
  pendingRoleChange.value = { userId, role };
};

const pendingRoleMember = computed(
  () =>
    members.find((m) => m.user_id === pendingRoleChange.value?.userId) ?? null,
);

const confirmRoleChange = () => {
  const change = pendingRoleChange.value;
  if (change?.role === 'owner') {
    emit('transfer-ownership', change.userId);
  } else if (change) {
    emit('update-role', change.userId, change.role);
  }
  pendingRoleChange.value = null;
};

const cancelRoleChange = () => {
  pendingRoleChange.value = null;
};

const requestMemberRemoval = (userId: string) => {
  const member = members.find((m) => m.user_id === userId);
  pendingRemoval.value = { userId, memberName: memberName(member) };
};

const confirmMemberRemoval = () => {
  if (pendingRemoval.value) {
    emit('remove-member', pendingRemoval.value.userId);
  }
  pendingRemoval.value = null;
};

const cancelMemberRemoval = () => {
  pendingRemoval.value = null;
};
</script>

<template>
  <UiCard padding="none">
    <template #header>
      <div class="flex items-center gap-2">
        <Icon
          name="heroicons:user-group"
          class="size-5 text-fg-muted"
          aria-hidden="true"
        />
        <h2 class="text-base font-semibold text-fg">
          {{ t('houseProfile.members') }}
          <span class="ml-1 text-sm font-normal text-fg-muted"
            >({{ members.length }})</span
          >
        </h2>
      </div>
    </template>

    <!-- One wrapper child so the body's space-y-4 doesn't separate the
         form, error and member rows; hairlines come from divide-y. -->
    <div class="divide-y divide-line">
      <p
        v-if="actionError && !actionErrorUserId"
        role="alert"
        class="px-5 pt-3 text-sm text-danger-fg"
      >
        {{ actionError }}
      </p>

      <!-- No `v-if` alongside `:show`: an outer v-if mounts the modal with show
         already true, so <Transition> skips the enter animation. -->
      <HouseRoleChangeModal
        :show="!!pendingRoleChange"
        :member="pendingRoleMember"
        :new-role="pendingRoleChange?.role ?? null"
        :loading="roleLoading"
        @confirm="confirmRoleChange"
        @cancel="cancelRoleChange"
      />

      <UiConfirmModal
        :show="!!pendingRemoval"
        confirm-variant="danger"
        :title="t('houseProfile.removeMemberTitle')"
        :message="
          t('houseProfile.removeMemberMessage', {
            name: pendingRemoval?.memberName ?? '',
          })
        "
        :confirm-text="t('houseProfile.removeMemberConfirm')"
        :cancel-text="t('common.cancel')"
        @confirm="confirmMemberRemoval"
        @cancel="cancelMemberRemoval"
        @close="cancelMemberRemoval"
      >
        <div
          v-if="removalBalanceNote"
          class="state-card state-card--warning mt-3"
        >
          <div class="state-card-icon-chip state-card-icon-chip--warning">
            <Icon
              name="heroicons:banknotes"
              class="size-4"
              aria-hidden="true"
            />
          </div>
          <p class="text-sm">{{ removalBalanceNote }}</p>
        </div>
      </UiConfirmModal>

      <ul role="list" class="divide-y divide-line">
        <li
          v-for="member in sortedMembers"
          :key="member.id"
          class="relative flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 transition-colors hover:bg-surface-hover"
        >
          <!-- Primary target: its ::after stretches over the whole row; secondary
             actions below sit on top (relative z-10). -->
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 text-left after:absolute after:inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            @click="emit('user-click', member.user_id)"
          >
            <UiUserAvatar size="md" :user="member.user" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-fg">
                {{ member.user?.first_name }} {{ member.user?.last_name }}
              </p>
              <p class="truncate text-xs text-fg-muted">
                {{ t('houseProfile.memberSince') }}
                {{ formatDate(member.joined_at) }}
              </p>
            </div>
          </button>

          <!-- Only roles that differ from the default get a badge, so
               "Owner" and "Co-admin" stand out instead of every row
               carrying one. -->
          <span
            v-if="member.role !== 'member'"
            class="badge badge-muted relative z-10 shrink-0"
          >
            {{ roleLabel(member.role) }}
          </span>

          <UiOverflowMenu
            v-if="isCurrentUserOwner && member.user_id !== currentUserId"
            class="relative z-10 shrink-0"
            :aria-label="
              t('a11y.buttons.memberActions', { name: memberName(member) })
            "
            :items="memberActionItems(member.role)"
            @select="handleMemberAction(member.user_id, $event)"
          />
          <Icon
            v-else
            name="heroicons:chevron-right"
            class="size-4 shrink-0 text-fg-subtle"
            aria-hidden="true"
          />

          <p
            v-if="actionError && actionErrorUserId === member.user_id"
            role="alert"
            class="relative z-10 basis-full text-sm text-danger-fg"
          >
            {{ actionError }}
          </p>
        </li>
      </ul>
    </div>
  </UiCard>
</template>
