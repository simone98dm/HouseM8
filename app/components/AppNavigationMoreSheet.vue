<script lang="ts" setup>
import type { AppNavItem } from '~/composables/useAppNavItems';

interface AppNavigationMoreSheetProps {
  show?: boolean;
  items?: AppNavItem[];
  profilePath?: string | null;
  isActive?: (path: string) => boolean;
  resolvePath?: (path: string) => string;
}

interface Events {
  close: [];
}

const {
  show = false,
  items = [],
  profilePath = null,
  isActive = () => false,
  resolvePath = (path: string) => path,
} = defineProps<AppNavigationMoreSheetProps>();

const emit = defineEmits<Events>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark';
};

const linkClass =
  'flex min-h-11 items-center gap-3 rounded-control px-3 text-base text-fg hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
</script>

<template>
  <UiModal :show="show" :title="$t('navigation.more')" @close="emit('close')">
    <ul class="flex flex-col gap-1" role="list">
      <li v-for="item in items" :key="item.path">
        <NuxtLink
          :to="resolvePath(item.path)"
          :class="[
            linkClass,
            isActive(item.path) && 'bg-brand-subtle font-semibold',
          ]"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="emit('close')"
        >
          <Icon :name="item.icon" class="size-5" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </li>
      <li v-if="profilePath">
        <NuxtLink
          :to="profilePath"
          :class="[
            linkClass,
            isActive(profilePath) && 'bg-brand-subtle font-semibold',
          ]"
          :aria-current="isActive(profilePath) ? 'page' : undefined"
          @click="emit('close')"
        >
          <Icon
            name="heroicons:user-circle"
            class="size-5"
            aria-hidden="true"
          />
          {{ $t('navigation.profile') }}
        </NuxtLink>
      </li>
      <li>
        <!-- Raw: full-width menu row, same box as the links above. -->
        <button
          type="button"
          :class="[linkClass, 'w-full text-left']"
          @click="toggleTheme"
        >
          <Icon
            :name="isDark ? 'heroicons:sun' : 'heroicons:moon'"
            class="size-5"
            aria-hidden="true"
          />
          {{
            isDark
              ? $t('navigation.switchToLight')
              : $t('navigation.switchToDark')
          }}
        </button>
      </li>
    </ul>
    <div class="mt-4 border-t border-line pt-4">
      <LegalLinks />
    </div>
  </UiModal>
</template>
