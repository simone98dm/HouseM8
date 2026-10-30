<script lang="ts" setup>
/**
 * HouseDangerZone - The irreversible exits, last on the page: members leave,
 * the owner archives (owners can't leave until ownership moves).
 */
interface HouseDangerZoneProps {
  isOwner?: boolean;
}
interface HouseDangerZoneEvents {
  leave: [];
  archive: [];
}

const { isOwner = false } = defineProps<HouseDangerZoneProps>();
const emit = defineEmits<HouseDangerZoneEvents>();

const { t } = useI18n();
const headingId = useId();
const leaveButton = ref<{ $el?: HTMLElement } | null>(null);

// The leave dialog unmounts with the page's v-if, so focus is handed back here.
defineExpose({ focusLeave: () => leaveButton.value?.$el?.focus() });
</script>

<template>
  <section :aria-labelledby="headingId">
    <h2 :id="headingId" class="mb-3 font-semibold text-danger-fg">
      {{ t('houseProfile.danger.title') }}
    </h2>
    <UiCard>
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-fg-muted">
          {{
            isOwner
              ? t('houseProfile.danger.ownerExplain')
              : t('houseProfile.danger.leaveExplain')
          }}
        </p>
        <UiButton
          v-if="isOwner"
          variant="danger"
          icon="archive-box"
          class="shrink-0"
          @click="emit('archive')"
        >
          {{ t('houseProfile.danger.archive') }}
        </UiButton>
        <UiButton
          v-else
          ref="leaveButton"
          variant="danger"
          icon="arrow-left-start-on-rectangle"
          class="shrink-0"
          @click="emit('leave')"
        >
          {{ t('houseProfile.danger.leave') }}
        </UiButton>
      </div>
    </UiCard>
  </section>
</template>
