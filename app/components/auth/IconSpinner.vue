<script lang="ts" setup>
// Shared loading spinner: login and register submit buttons, and confirm's
// pending state, render the identical circle+path markup. `.auth-spinner`
// (shell-owned, global) supplies the animation; the inline style guarantees
// the size wins over that class's own 16px default regardless of it.
interface Props {
  size?: number;
}

const { size = 16 } = defineProps<Props>();
</script>

<template>
  <svg
    class="auth-spinner"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <circle
      class="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="4"
    />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
</template>
