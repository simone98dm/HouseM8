<script lang="ts" setup>
interface BillListHeaderProps {
  title: string;
}

defineProps<BillListHeaderProps>();
</script>

<template>
  <h2 class="text-base font-semibold text-fg">
    {{ title }}
  </h2>
</template>
