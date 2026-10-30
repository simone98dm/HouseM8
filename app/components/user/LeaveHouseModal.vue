<script lang="ts" setup>
import type { HouseMember } from '~/types';

interface LeaveHouseModalProps {
  houseId: string;
  houseName: string;
  isOwner: boolean;
}

interface LeaveHouseModalEvents {
  close: [];
  left: [];
}

const props = defineProps<LeaveHouseModalProps>();
const emit = defineEmits<LeaveHouseModalEvents>();

const { t } = useI18n();
const houses = useHouses();
const userStore = useUserStore();

const netBalance = ref<number>(0);
const loadingBalance = ref(true);
const leaving = ref(false);
const error = ref('');
const balanceFetchError = ref(false);
const members = ref<HouseMember[]>([]);
const newOwnerId = ref<string | null>(null);

onMounted(async () => {
  const [result, membersResult] = await Promise.all([
    houses.getUserBalanceInHouse(props.houseId),
    props.isOwner ? houses.getHouseMembers(props.houseId) : null,
  ]);
  if (result.data !== null && result.data !== undefined) {
    netBalance.value = result.data.net_balance;
  } else {
    balanceFetchError.value = true;
  }
  if (membersResult?.error) balanceFetchError.value = true;
  members.value = membersResult?.data ?? [];
  loadingBalance.value = false;
});

// The owner hands the role to someone still in the house before leaving.
const ownerCandidates = computed(() =>
  members.value.filter(
    (m) => m.user_id !== userStore.currentUser?.id && !m.left_at,
  ),
);
const isSoleOwner = computed(
  () => props.isOwner && ownerCandidates.value.length === 0,
);

const memberName = (m: HouseMember) =>
  `${m.user?.first_name ?? ''} ${m.user?.last_name ?? ''}`.trim();

const hasBalance = computed(() => netBalance.value < -0.01);
const canLeave = computed(
  () =>
    !hasBalance.value &&
    !balanceFetchError.value &&
    (!props.isOwner || !!newOwnerId.value),
);

const handleLeave = async () => {
  if (!canLeave.value) return;
  leaving.value = true;
  error.value = '';
  const result = await houses.leaveHouse(
    props.houseId,
    props.isOwner ? (newOwnerId.value ?? undefined) : undefined,
  );
  leaving.value = false;
  if (result.error) {
    error.value = result.error;
    return;
  }
  emit('left');
};
</script>

<template>
  <UiModal :show="true" :title="t('house.leave.title')" @close="emit('close')">
    <div v-if="loadingBalance" class="flex items-center justify-center py-6">
      <Icon
        name="heroicons:arrow-path"
        class="w-6 h-6 animate-spin text-fg-muted"
        aria-hidden="true"
      />
    </div>

    <template v-else>
      <div
        v-if="hasBalance"
        class="state-card state-card--error mb-4"
        role="alert"
      >
        <div class="state-card-icon-chip state-card-icon-chip--error">
          <Icon
            name="heroicons:exclamation-circle"
            class="w-4 h-4"
            aria-hidden="true"
          />
        </div>
        <p class="text-sm">
          {{
            t('house.leave.pendingBalance', {
              amount: Math.abs(netBalance).toFixed(2),
            })
          }}
        </p>
      </div>

      <div
        v-else-if="balanceFetchError"
        class="state-card state-card--error"
        role="alert"
      >
        <div class="state-card-icon-chip state-card-icon-chip--error">
          <Icon
            name="heroicons:exclamation-circle"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </div>
        <p class="text-sm">{{ t('errors.generic') }}</p>
      </div>

      <div
        v-else-if="isSoleOwner"
        class="state-card state-card--warning mb-4"
        role="alert"
      >
        <div class="state-card-icon-chip state-card-icon-chip--warning">
          <Icon
            name="heroicons:exclamation-triangle"
            class="w-4 h-4"
            aria-hidden="true"
          />
        </div>
        <p class="text-sm">
          {{ t('house.leave.soleOwnerWarning') }}
        </p>
      </div>

      <fieldset v-else-if="isOwner" class="mb-4">
        <legend class="text-sm text-fg">
          {{ t('house.leave.ownerWarning') }}
        </legend>
        <p class="mt-1 text-sm font-semibold text-fg">
          {{ t('house.leave.selectNewOwner') }}
        </p>
        <div class="mt-3 space-y-2">
          <label
            v-for="member in ownerCandidates"
            :key="member.user_id"
            :class="[
              'flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
              newOwnerId === member.user_id
                ? 'border-brand bg-brand-subtle'
                : 'border-line',
            ]"
          >
            <input
              v-model="newOwnerId"
              type="radio"
              name="new-owner"
              :value="member.user_id"
              class="accent-brand"
            />
            <UiUserAvatar size="sm" :user="member.user" />
            <span class="text-sm text-fg">
              {{ memberName(member) }}
            </span>
          </label>
        </div>
      </fieldset>

      <div v-else class="mb-4">
        <p class="text-fg text-sm">
          {{ t('house.leave.message') }}
        </p>
        <p class="text-fg-muted text-sm mt-1">
          {{ t('house.leave.warning') }}
        </p>
      </div>

      <p v-if="error" class="text-sm text-danger-fg mt-2" role="alert">
        {{ error }}
      </p>
    </template>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">
        {{ t('common.cancel') }}
      </UiButton>

      <UiButton v-if="hasBalance" variant="secondary" disabled>
        {{ t('house.leave.settleFirst') }}
      </UiButton>

      <UiButton v-else-if="isSoleOwner" variant="secondary" disabled>
        {{ t('house.leave.transferFirst') }}
      </UiButton>

      <UiButton
        v-else
        variant="danger"
        :loading="leaving"
        :disabled="!canLeave || loadingBalance"
        @click="handleLeave"
      >
        {{
          isOwner ? t('house.leave.transferAndLeave') : t('house.leave.leave')
        }}
      </UiButton>
    </template>
  </UiModal>
</template>
