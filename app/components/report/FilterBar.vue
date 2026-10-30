<script lang="ts" setup>
/**
 * ReportFilterBar - Underline-tab filter bar for report status
 * Matches the segmented tab style from the maintenance-reports templates.
 */

import type { ReportStatus } from '~/types';

interface Props {
  counts: { all: number; not_read: number; read: number; solved: number };
}

const { counts } = defineProps<Props>();

const modelValue = defineModel<ReportStatus | undefined>({ required: true });

const { t } = useI18n();

const tabs = computed(() => [
  {
    key: undefined as ReportStatus | undefined,
    label: t('reports.filters.all'),
    count: counts.all,
  },
  {
    key: 'not_read' as ReportStatus,
    label: t('reports.filters.pending'),
    count: counts.not_read,
  },
  {
    key: 'read' as ReportStatus,
    label: t('reports.filters.inProgress'),
    count: counts.read,
  },
  {
    key: 'solved' as ReportStatus,
    label: t('reports.filters.resolved'),
    count: counts.solved,
  },
]);

// Roving tabindex: only the selected tab is in the Tab order (tabindex 0),
// so arrow keys are the only way to reach the other tabs — without this
// handler they were unreachable by keyboard entirely. DOM focus must also
// follow the selection (ARIA APG Tabs pattern), or it gets stranded on the
// now-inactive (tabindex="-1") button.
const handleTabKeydown = (event: KeyboardEvent) => {
  const keys = tabs.value.map((tab) => tab.key);
  const idx = keys.findIndex((key) => key === modelValue.value);
  let nextIdx: number;
  if (event.key === 'ArrowRight') {
    nextIdx = (idx + 1) % keys.length;
  } else if (event.key === 'ArrowLeft') {
    nextIdx = (idx - 1 + keys.length) % keys.length;
  } else {
    return;
  }
  event.preventDefault();
  modelValue.value = keys[nextIdx];
  const tablist = event.currentTarget as HTMLElement;
  nextTick(() =>
    tablist
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIdx]?.focus(),
  );
};
</script>

<template>
  <div
    class="flex gap-2 overflow-x-auto rounded-t-card border-b border-line bg-surface px-2"
    role="tablist"
    :aria-label="$t('a11y.filterBar.reports')"
    @keydown="handleTabKeydown"
  >
    <!-- Raw: role="tab" with roving tabindex (ARIA APG Tabs pattern) —
         UiButton has no tab-widget semantics or selected-underline style. -->
    <button
      v-for="tab in tabs"
      :key="tab.key ?? 'all'"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.key"
      :tabindex="modelValue === tab.key ? 0 : -1"
      class="px-4 py-2 text-sm border-b-2 -mb-[2px] transition-colors whitespace-nowrap shrink-0"
      :class="
        modelValue === tab.key
          ? 'font-semibold text-brand border-brand'
          : 'font-medium text-fg-muted hover:text-fg border-transparent hover:border-line-control'
      "
      @click="modelValue = tab.key"
    >
      {{ tab.label }}
      <span v-if="tab.count > 0" class="ml-1 text-xs">({{ tab.count }})</span>
    </button>
  </div>
</template>
