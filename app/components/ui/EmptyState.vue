<script lang="ts" setup>
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  /** Heading level of the title; 2 under the page h1, 3 inside a section. */
  headingLevel?: 2 | 3 | 4;
}

const {
  icon,
  title,
  description = undefined,
  headingLevel = 2,
} = defineProps<EmptyStateProps>();
</script>

<template>
  <div
    class="flex flex-col items-center rounded-card border border-line bg-surface px-4 py-16 text-center"
  >
    <div v-if="$slots.illustration" class="mb-4">
      <slot name="illustration" />
    </div>
    <span v-else class="mb-4 rounded-full bg-brand-subtle p-4">
      <Icon :name="icon" class="size-10 text-brand" aria-hidden="true" />
    </span>
    <component
      :is="`h${headingLevel}`"
      class="mb-1 text-base font-semibold text-fg"
    >
      {{ title }}
    </component>
    <p v-if="description" class="max-w-xs text-sm text-fg-muted">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
