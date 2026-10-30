<script lang="ts" setup>
// Shared padlock icon: login's password field and password-reset's two
// password fields rendered three identical copies of this path inline.
// Mirrors AuthIconEmail — `size` defaults to the input-icon size.
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
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
</template>
