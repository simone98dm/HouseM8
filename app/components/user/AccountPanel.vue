<script setup lang="ts">
import type { House } from '~/types';

interface Props {
  currentHouse?: House | null;
  loading?: boolean;
}

interface Emits {
  'sign-out': [];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const colorMode = useColorMode();
const themeOptions = computed(() => [
  { value: 'system', label: t('settings.appearance.system') },
  { value: 'light', label: t('settings.appearance.light') },
  { value: 'dark', label: t('settings.appearance.dark') },
]);
</script>

<template>
  <div class="mt-6 space-y-6">
    <UiCard :title="$t('profile.settings.title')" :heading-level="2">
      <UiLanguageSwitcher />
      <div class="flex items-center justify-between border-t border-line pt-4">
        <span class="text-sm font-medium text-fg">
          {{ t('settings.appearance.theme') }}
        </span>
        <UiSelect
          :model-value="colorMode.preference"
          :options="themeOptions"
          :aria-label="t('settings.appearance.theme')"
          class="w-36"
          @update:model-value="colorMode.preference = String($event)"
        />
      </div>
    </UiCard>

    <!-- No House State — the standalone "Current House" card that used to
         live here (name/address/member count + a Leave House button) was
         removed: it duplicated UserProfile's own Current House card (which
         has a working leave-house flow with a real modal), and this page's
         copy wired its button to a ref nothing ever read. -->
    <UiCard v-if="!currentHouse && !loading">
      <div class="py-2 text-center">
        <div
          class="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-surface-hover"
        >
          <Icon
            name="heroicons:home"
            class="h-5 w-5 text-fg-muted"
            aria-hidden="true"
          />
        </div>
        <h2 class="mb-1 text-sm font-semibold text-fg">
          {{ $t('profile.noHouse.title') }}
        </h2>
        <p class="text-xs text-fg-muted">
          {{ $t('profile.noHouse.message') }}
        </p>
      </div>
    </UiCard>

    <UiCard :title="$t('profile.about.title')" :heading-level="2">
      <div class="space-y-2 text-sm text-fg-muted">
        <p>{{ $t('profile.about.version') }}</p>
        <p>{{ $t('profile.about.description') }}</p>
      </div>
    </UiCard>

    <div class="pb-6 pt-2">
      <UiButton
        variant="secondary"
        :full-width="true"
        icon="arrow-left-start-on-rectangle"
        @click="emit('sign-out')"
      >
        {{ $t('auth.signOut') }}
      </UiButton>
    </div>
  </div>
</template>
