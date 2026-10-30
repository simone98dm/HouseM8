<script lang="ts" setup>
// Shared checkmark icon: login's "email confirmed" banner and confirm's
// success state render the identical path. Size is a prop (rather than a
// class targeted by a parent's :deep()) so this stays correct regardless of
// how many component boundaries it's nested behind.
interface Props {
  size?: number;
}

const { size = 16 } = defineProps<Props>();
</script>

<template>
  <svg
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    aria-hidden="true"
    style="shrink: 0; margin-top: 1px"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
</template>
