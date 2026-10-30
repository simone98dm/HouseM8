<script lang="ts" setup>
interface AppNavigationBottomNavProps {
  hasHouse?: boolean;
  currentHouseId?: string;
}

const { hasHouse = false, currentHouseId = '' } =
  defineProps<AppNavigationBottomNavProps>();

const route = useRoute();
const {
  primaryItems,
  secondaryItems,
  profilePath,
  isProfileActive,
  isActive,
  resolvedPath,
} = useAppNavItems(
  () => hasHouse,
  () => currentHouseId,
);

const isMoreOpen = ref(false);
// "More" reads as current while one of its destinations is the open page.
const isMoreActive = computed(
  () =>
    isProfileActive.value ||
    secondaryItems.value.some((item) => isActive(item.path)),
);

watch(
  () => route.path,
  () => {
    isMoreOpen.value = false;
  },
);
</script>

<template>
  <nav class="bottom-nav" :aria-label="$t('navigation.mainMobile')">
    <NuxtLink
      v-for="item in primaryItems"
      :key="item.path"
      :to="resolvedPath(item.path)"
      class="bottom-nav-item"
      :class="{ active: isActive(item.path) }"
      :aria-current="isActive(item.path) ? 'page' : undefined"
    >
      <Icon :name="item.icon" class="w-[22px] h-[22px]" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </NuxtLink>

    <!-- Raw: bottom-nav slot, must match the sibling NuxtLink boxes. -->
    <button
      v-if="profilePath || secondaryItems.length"
      type="button"
      class="bottom-nav-item"
      :class="{ active: isMoreActive }"
      aria-haspopup="dialog"
      :aria-expanded="isMoreOpen"
      @click="isMoreOpen = true"
    >
      <Icon
        name="heroicons:ellipsis-horizontal-circle"
        class="w-[22px] h-[22px]"
        aria-hidden="true"
      />
      <span>{{ $t('navigation.more') }}</span>
    </button>

    <AppNavigationMoreSheet
      :show="isMoreOpen"
      :items="secondaryItems"
      :profile-path="profilePath"
      :is-active="isActive"
      :resolve-path="resolvedPath"
      @close="isMoreOpen = false"
    />
  </nav>
</template>

<style scoped>
.bottom-nav {
  /* Total bar height incl. the home-indicator inset; the page reserves the
     same amount (see layout padding-bottom). */
  --bottom-nav-total: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-nav-total);
  padding: 0 8px env(safe-area-inset-bottom);
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: var(--z-nav);
  align-items: stretch;
  justify-content: space-around;
}

.bottom-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1 1 0;
  min-width: 44px;
  min-height: 44px;
  padding: 8px 4px;
  border: none;
  background: none;
  border-radius: var(--radius-control);
  color: var(--fg-muted);
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 500;
  transition: color var(--transition);
  cursor: pointer;
}

.bottom-nav-item span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bottom-nav-item:hover {
  text-decoration: none;
}
.bottom-nav-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
/* Not colour alone: heavier label + a 2px bar on the top edge. */
.bottom-nav-item.active {
  color: var(--primary);
  font-weight: 600;
}
.bottom-nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: var(--primary);
}

@media (width >= 48rem) {
  .bottom-nav {
    display: none;
  }
}
</style>
