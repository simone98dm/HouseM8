<script lang="ts" setup>
/**
 * Thumb-zone primary action for list pages (expenses, bills, reports).
 * Phones only: from md up the page header carries the same action.
 */
interface FabProps {
  label: string;
  icon?: string;
}

const { label, icon = 'heroicons:plus' } = defineProps<FabProps>();

interface FabEvents {
  click: [];
}

const emit = defineEmits<FabEvents>();
</script>

<template>
  <button
    type="button"
    class="fab fixed bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+16px)] right-4 z-[var(--z-sticky)] flex size-14 items-center justify-center rounded-full bg-brand text-brand-on shadow-lg transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
    :aria-label="label"
    @click="emit('click')"
  >
    <Icon :name="icon" class="size-6" aria-hidden="true" />
  </button>
</template>
