<script lang="ts" setup>
import type { HouseMember } from '~/types';

/**
 * Confirms a member role change, shown as a git-style diff: the role being left
 * behind struck through, the incoming role beside it.
 *
 * The arrow is load-bearing, not decoration. Red/green alone would carry the
 * meaning in colour only, which fails WCAG 1.4.1 and is invisible to the most
 * common form of colour blindness. Strikethrough plus direction encode "from"
 * and "to" independently of hue, the same way git uses -/+ rather than colour.
 */
interface Props {
  show: boolean;
  member: HouseMember | null;
  newRole: 'owner' | 'admin' | 'member' | null;
  loading?: boolean;
}

interface Events {
  confirm: [];
  cancel: [];
}

const { show, member, newRole, loading = false } = defineProps<Props>();
const emit = defineEmits<Events>();

const { t } = useI18n();

const memberName = computed(() => {
  const u = member?.user;
  return `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
});

const roleLabel = (role: string | null | undefined) => {
  if (role === 'owner') return t('houseProfile.roleOwner');
  if (role === 'admin') return t('houseProfile.roleAdmin');
  return t('houseProfile.roleMember');
};

const currentRoleLabel = computed(() => roleLabel(member?.role));
const nextRoleLabel = computed(() => roleLabel(newRole));

// Ownership is a transfer, not a promotion: the current owner loses every
// power, and only the new owner could hand it back.
const isOwnershipTransfer = computed(() => newRole === 'owner');

// Named so screen readers get the whole change in one utterance instead of
// three disconnected fragments.
const summaryId = useId();
const changeSummary = computed(() =>
  t('houseProfile.roleChange.summary', {
    name: memberName.value,
    from: currentRoleLabel.value,
    to: nextRoleLabel.value,
  }),
);
</script>

<template>
  <UiModal
    :show="show"
    :title="t('houseProfile.roleChange.title')"
    max-width="max-w-md"
    :role="isOwnershipTransfer ? 'alertdialog' : 'dialog'"
    :aria-describedby="summaryId"
    @close="emit('cancel')"
  >
    <div class="space-y-5">
      <div class="flex items-center gap-3">
        <UiUserAvatar size="md" :user="member?.user" />
        <p class="text-base font-bold text-fg">
          {{ memberName }}
        </p>
      </div>

      <!-- The diff. aria-hidden on the visual row because `changeSummary`
           below states the same change as one sentence; announcing both would
           read the roles twice. -->
      <div
        class="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-raised px-4 py-3"
        aria-hidden="true"
      >
        <span
          class="text-sm font-semibold text-danger-fg line-through decoration-2"
        >
          {{ currentRoleLabel }}
        </span>

        <Icon
          name="heroicons:arrow-right"
          class="h-4 w-4 shrink-0 text-fg-muted"
        />

        <span class="text-sm font-semibold text-ok-fg">
          {{ nextRoleLabel }}
        </span>
      </div>

      <p :id="summaryId" class="sr-only">{{ changeSummary }}</p>

      <div
        v-if="isOwnershipTransfer"
        class="state-card state-card--warning"
        role="alert"
      >
        <div class="state-card-icon-chip state-card-icon-chip--warning">
          <Icon
            name="heroicons:exclamation-triangle"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </div>
        <p class="text-sm">
          {{ t('houseProfile.roleChange.effect.owner') }}
        </p>
      </div>

      <p v-else class="text-sm text-fg-muted">
        {{ t(`houseProfile.roleChange.effect.${newRole ?? 'member'}`) }}
      </p>
    </div>

    <template #footer>
      <UiButton variant="secondary" :disabled="loading" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton
        :variant="isOwnershipTransfer ? 'danger' : 'primary'"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{
          isOwnershipTransfer
            ? t('houseProfile.roleChange.transferConfirm')
            : t('common.confirm')
        }}
      </UiButton>
    </template>
  </UiModal>
</template>
