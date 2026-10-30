<script lang="ts" setup>
// Thin orchestrator: desktop sidebar and mobile bottom nav are genuinely
// different navigation surfaces (different DOM, different layout, only one
// visible at a time via the md (48rem) breakpoint), so they live in their own
// components — AppNavigationSidebar.vue and AppNavigationBottomNav.vue.
// Shared filtering/route-matching logic lives in the useAppNavItems()
// composable so it isn't duplicated between them. Both children read
// userStore.isAuthenticated directly (no prop — see Phase 4a) and render
// inside the same <ClientOnly> boundary as this component (layouts/default.vue).
interface AppNavigationProps {
  hasHouse?: boolean;
  currentHouseId?: string;
}

const { hasHouse = false, currentHouseId = '' } =
  defineProps<AppNavigationProps>();
</script>

<template>
  <AppNavigationSidebar
    :has-house="hasHouse"
    :current-house-id="currentHouseId"
  />
  <AppNavigationBottomNav
    :has-house="hasHouse"
    :current-house-id="currentHouseId"
  />
</template>
