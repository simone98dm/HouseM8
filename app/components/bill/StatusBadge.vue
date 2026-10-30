<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>

<template>
  <span class="badge" :class="active ? 'badge-success' : 'badge-muted'">
    {{ active ? $t('bills.details.active') : $t('bills.details.inactive') }}
  </span>
</template>
