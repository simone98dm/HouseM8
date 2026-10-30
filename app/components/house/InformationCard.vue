<script lang="ts" setup>
/**
 * HouseInformationCard — Overview header of the house page (the name is the
 * page h1): one sentence about it and the primary "Invite someone" action. A full
 * house replaces Invite with the reason and the way out. The facts and
 * editing live in HouseKeyFacts.
 */

interface HouseInformationCardProps {
  isOwner?: boolean;
  /** The lead sentence, e.g. "2 of 3 places taken · everyone's square". */
  summary?: string;
  canInvite?: boolean;
  /** Can invite in principle (owner or co-admin), even if the house is full. */
  canManageMembers?: boolean;
  isFull?: boolean;
}

interface HouseInformationCardEvents {
  invite: [];
}

const {
  isOwner = false,
  summary = '',
  canInvite = false,
  canManageMembers = false,
  isFull = false,
} = defineProps<HouseInformationCardProps>();
const emit = defineEmits<HouseInformationCardEvents>();

const { t } = useI18n();

// Only people who could invite need to know why they can't right now.
const fullHint = computed(() => {
  if (!isFull || !canManageMembers) return '';
  return isOwner
    ? t('houseProfile.fullHintOwner')
    : t('houseProfile.fullHintAdmin');
});
</script>

<template>
  <UiCard>
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p class="text-lg font-semibold text-fg">{{ summary }}</p>
        <p v-if="fullHint" class="mt-1 text-sm text-fg-muted">
          {{ fullHint }}
        </p>
      </div>
      <UiButton
        v-if="canInvite"
        class="shrink-0"
        variant="primary"
        icon="user-plus"
        @click="emit('invite')"
      >
        {{ t('houseProfile.invite.title') }}
      </UiButton>
    </div>
  </UiCard>
</template>
