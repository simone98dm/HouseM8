<!-- Size justification (Phase 7): 268 lines, ~18 over the ~250 guideline.
     Single coherent responsibility (count is approximate — it drifts as this
     comment is edited; the reasoning is what matters)
     (the desktop sidebar: nav links, theme toggle, avatar) with ~140 of
     those lines being its own scoped CSS (fixed-size nav rail, CSS tooltip,
     solid logo tile). Splitting further would only relocate that CSS
     into a second file with no logic or template to go with it — pure
     indirection, not a real component boundary. Left as one file. -->
<script lang="ts" setup>
interface AppNavigationSidebarProps {
  hasHouse?: boolean;
  currentHouseId?: string;
}

const { hasHouse = false, currentHouseId = '' } =
  defineProps<AppNavigationSidebarProps>();

const colorMode = useColorMode();
const userStore = useUserStore();

const { primaryItems, secondaryItems, profilePath, isActive, resolvedPath } =
  useAppNavItems(
    () => hasHouse,
    () => currentHouseId,
  );

const isDark = computed(() => colorMode.value === 'dark');
const toggleDarkMode = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark';
};
</script>

<template>
  <div class="sidebar">
    <NuxtLink to="/dashboard" class="sidebar-logo" :aria-label="$t('app.name')">
      M8
    </NuxtLink>

    <nav class="sidebar-nav" :aria-label="$t('navigation.main')">
      <NuxtLink
        v-for="item in primaryItems"
        :key="item.path"
        :to="resolvedPath(item.path)"
        class="sidebar-item"
        :class="{ active: isActive(item.path) }"
        :data-tooltip="item.label"
        :aria-label="item.label"
        :aria-current="isActive(item.path) ? 'page' : undefined"
      >
        <Icon :name="item.icon" class="w-5 h-5" aria-hidden="true" />
      </NuxtLink>

      <div
        v-if="secondaryItems.length"
        class="sidebar-divider"
        role="separator"
      />

      <NuxtLink
        v-for="item in secondaryItems"
        :key="item.path"
        :to="resolvedPath(item.path)"
        class="sidebar-item"
        :class="{ active: isActive(item.path) }"
        :data-tooltip="item.label"
        :aria-label="item.label"
        :aria-current="isActive(item.path) ? 'page' : undefined"
      >
        <Icon :name="item.icon" class="w-5 h-5" aria-hidden="true" />
      </NuxtLink>
    </nav>

    <div class="sidebar-bottom">
      <!-- Raw: fixed 48x44 nav-rail slot that must match the adjacent
           .sidebar-item NuxtLinks pixel-for-pixel; UiButton's padding-based
           size scale can't hit that exact box. -->
      <button
        type="button"
        class="theme-toggle"
        :aria-label="
          isDark
            ? $t('navigation.switchToLight')
            : $t('navigation.switchToDark')
        "
        @click="toggleDarkMode"
      >
        <Icon
          :name="isDark ? 'heroicons:sun' : 'heroicons:moon'"
          class="w-[18px] h-[18px]"
          aria-hidden="true"
        />
      </button>

      <NuxtLink
        v-if="profilePath && userStore.currentUser"
        :to="profilePath"
        class="sidebar-avatar"
        :title="
          `${userStore.currentUser.first_name} ${userStore.currentUser.last_name}`.trim() ||
          userStore.currentUser.email
        "
        :aria-label="$t('navigation.profile')"
        :aria-current="isActive(profilePath) ? 'page' : undefined"
      >
        <UiUserAvatar
          :user="userStore.currentUser"
          size="sm"
          aria-hidden="true"
        />
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* ── Sidebar ── */
.sidebar {
  grid-area: sidebar;
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  z-index: var(--z-nav);
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-control);
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-fg);
  font-weight: 700;
  font-size: var(--fs-md);
  letter-spacing: -0.5px;
  margin-bottom: 20px;
  flex-shrink: 0;
  text-decoration: none;
}
.sidebar-logo:hover {
  text-decoration: none;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 0 8px;
  flex: 1;
}

.sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 44px;
  border-radius: var(--radius-control);
  color: var(--fg-muted);
  transition:
    background var(--transition),
    color var(--transition);
  cursor: pointer;
  text-decoration: none;
}
.sidebar-item:hover {
  background: var(--surface-hover);
  color: var(--fg);
  text-decoration: none;
}
.sidebar-item.active {
  background: var(--primary-subtle);
  color: var(--primary);
}

/* CSS tooltip */
.sidebar-item::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--fg);
  color: var(--surface);
  font-size: var(--fs-sm);
  font-weight: 500;
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: var(--radius-control);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition);
  z-index: var(--z-tooltip);
}
.sidebar-item:hover::after,
.sidebar-item:focus-visible::after {
  opacity: 1;
}

.sidebar-divider {
  width: 32px;
  height: 1px;
  background: var(--border);
  margin: 8px auto;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.sidebar-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-decoration: none;
  flex-shrink: 0;
}
.sidebar-avatar:hover {
  text-decoration: none;
  opacity: 0.9;
}

.theme-toggle {
  width: 48px;
  height: 44px;
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted);
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition);
  background: none;
  border: none;
}
.theme-toggle:focus-visible,
.sidebar-item:focus-visible,
.sidebar-logo:focus-visible,
.sidebar-avatar:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.theme-toggle:hover {
  background: var(--surface-hover);
  color: var(--fg);
}

@media (width < 48rem) {
  .sidebar {
    display: none;
  }
}
</style>
