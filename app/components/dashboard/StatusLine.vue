<script lang="ts" setup>
import type { AttentionItem } from '~/composables/useDashboardPage';

interface StatusLineProps {
  /** Null when the viewer is not an owner/admin, or the signals are loading. */
  items: AttentionItem[] | null;
}

const { items } = defineProps<StatusLineProps>();

const { t } = useI18n();

const total = computed(() =>
  (items ?? []).reduce((sum, item) => sum + item.count, 0),
);
</script>

<template>
  <section
    v-if="items"
    :aria-label="t('home.status.label')"
    class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
  >
    <p v-if="total === 0" class="flex items-center gap-2 text-fg-muted">
      <Icon
        name="heroicons:check-circle"
        class="size-5 text-ok-fg"
        aria-hidden="true"
      />
      {{ t('home.status.allInOrder') }}
    </p>
    <template v-else>
      <p class="flex items-center gap-2 font-semibold text-fg">
        <Icon
          name="heroicons:exclamation-circle"
          class="size-5 text-warn-fg"
          aria-hidden="true"
        />
        {{ t('home.status.needAttention', { n: total }, total) }}
      </p>
      <ul role="list" class="flex flex-wrap gap-x-4 gap-y-1">
        <li v-for="item in items" :key="item.key">
          <NuxtLink
            :to="item.to"
            class="inline-block rounded-control py-1 font-medium text-fg underline underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {{
              t(
                `home.status.${item.key}`,
                { n: item.count, amount: item.amount ?? '' },
                item.count,
              )
            }}
          </NuxtLink>
        </li>
      </ul>
    </template>
  </section>
</template>
