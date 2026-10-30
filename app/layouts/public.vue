<script setup lang="ts">
useThemeColor();
defineOptions({ name: 'PublicLayout' });
useSeoMeta({ robots: 'index, follow' });
</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-bg text-fg">
    <PageHeader />
    <main
      id="main-content"
      tabindex="-1"
      class="mx-auto max-w-6xl px-4 focus:outline-none py-10 sm:px-6 sm:py-14 lg:px-8"
    >
      <slot />
    </main>
    <PageFooter />
  </div>
</template>
