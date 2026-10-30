<script lang="ts" setup>
/**
 * HouseJoinCodeCard — the house's 6-digit join code, bold and copyable, with
 * its expiry. Codes are single use and last 24h, so it always offers a fresh
 * one. Lives inside the invite modal ("Share a code").
 */

import type { JoinCode } from '~/types';

interface HouseJoinCodeCardProps {
  joinCode: JoinCode | null;
  loading?: boolean;
  generating?: boolean;
  hasError?: boolean;
}

interface HouseJoinCodeCardEvents {
  generate: [];
  copy: [];
}

const {
  joinCode,
  loading = false,
  generating = false,
  hasError = false,
} = defineProps<HouseJoinCodeCardProps>();
const emit = defineEmits<HouseJoinCodeCardEvents>();

const { t } = useI18n();
const { formatDateTime } = useDate();

const expiresAt = computed(() =>
  joinCode ? formatDateTime(joinCode.code_expires_at) : '',
);
</script>

<template>
  <section class="space-y-3">
    <h3 class="flex items-center gap-2 text-base font-semibold text-fg">
      <Icon
        name="heroicons:key"
        class="size-5 text-fg-muted"
        aria-hidden="true"
      />
      {{ t('houseProfile.joinCode.title') }}
    </h3>
    <p class="text-sm text-fg-muted">
      {{ t('houseProfile.joinCode.explain') }}
    </p>

    <div v-if="loading" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <UiSkeleton class="h-9 w-36" />
    </div>

    <div v-else-if="joinCode">
      <div class="flex items-center gap-2">
        <!-- The code itself copies too: it is the big target on a phone. -->
        <button
          type="button"
          class="rounded-control px-1 font-mono text-3xl font-bold tracking-[0.2em] text-fg tabular-nums hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          :aria-label="
            t('houseProfile.joinCode.copyCode', { code: joinCode.code })
          "
          @click="emit('copy')"
        >
          {{ joinCode.code }}
        </button>
        <UiButton
          variant="ghost"
          size="sm"
          icon="clipboard-document"
          @click="emit('copy')"
        >
          {{ t('houseProfile.joinCode.copy') }}
        </UiButton>
      </div>
      <p class="mt-1 text-sm text-fg-muted">
        {{ t('houseProfile.joinCode.validUntil', { date: expiresAt }) }}
      </p>
    </div>

    <p v-else class="text-sm text-fg-muted">
      {{ t('houseProfile.joinCode.none') }}
    </p>

    <p v-if="hasError" class="text-sm text-danger-fg" role="alert">
      {{ t('houseProfile.joinCode.error') }}
    </p>

    <UiButton
      variant="secondary"
      size="sm"
      icon="arrow-path"
      :loading="generating"
      @click="emit('generate')"
    >
      {{
        joinCode
          ? t('houseProfile.joinCode.regenerate')
          : t('houseProfile.joinCode.generate')
      }}
    </UiButton>
  </section>
</template>
