<script lang="ts" setup>
/**
 * ReportCard - Report entry with image, status badge and View Details CTA.
 * Desktop (@md+): horizontal layout with w-48 side image.
 * Mobile: stacked card with full-width aspect-[16/9] cover image.
 */

import type { Report, ReportPriority } from '~/types';
import { getReportStatus } from '~/types';

interface Props {
  report: Report;
  isOwner?: boolean;
}

const { report, isOwner = false } = defineProps<Props>();

interface Events {
  view: [report: Report];
  'mark-solved': [reportId: string];
}

const emit = defineEmits<Events>();

const { t } = useI18n();
const { formatShort } = useDate();

const status = computed(() => getReportStatus(report));

const leadImage = computed(() => report.images?.[0] ?? null);

const statusClass = computed(() => {
  if (status.value === 'solved') return 'badge-success';
  if (status.value === 'read') return 'badge-muted';
  return 'badge-warning';
});

const statusDotClass = computed(() => {
  if (status.value === 'solved') return 'bg-ok';
  if (status.value === 'read') return 'bg-fg-muted';
  return 'bg-warn';
});

const statusLabel = computed(() => {
  if (status.value === 'solved') return t('reports.filters.resolved');
  if (status.value === 'read') return t('reports.filters.inProgress');
  return t('reports.filters.pending');
});

const reporterName = computed(() => {
  if (report.user) return `${report.user.first_name} ${report.user.last_name}`;
  return t('reports.unknownUser');
});

const formatDate = (date: string | null | undefined) => formatShort(date);

const priorityBg = (priority: ReportPriority | null | undefined) => {
  if (priority === 'high') return 'bg-danger';
  if (priority === 'low') return 'bg-ok';
  return 'bg-fg-muted';
};

const priorityClass = (priority: ReportPriority | null | undefined) => {
  if (priority === 'high') return 'badge-danger';
  if (priority === 'low') return 'badge-success';
  return 'badge-muted';
};

const priorityLabel = (priority: ReportPriority | null | undefined) => {
  if (priority === 'high') return t('reports.priority.high');
  if (priority === 'low') return t('reports.priority.low');
  return t('reports.priority.medium');
};

const handleMarkSolved = () => emit('mark-solved', report.id);
</script>

<template>
  <UiCard as="article" padding="none" interactive class="@container relative">
    <div class="flex flex-col @md:flex-row">
      <div
        class="relative w-full @md:w-48 aspect-[16/9] @md:aspect-auto @md:h-auto shrink-0 bg-surface-hover overflow-hidden"
      >
        <img
          v-if="leadImage"
          :src="leadImage.url"
          :alt="t('reports.card.reportAlt')"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <Icon
            name="heroicons:document-text"
            class="w-10 h-10 text-fg-muted"
            aria-hidden="true"
          />
        </div>
        <div v-if="report.priority" class="absolute top-3 left-3 @md:hidden">
          <span
            class="text-on-status fs-2xs font-semibold px-2 py-1 rounded"
            :class="priorityBg(report.priority)"
          >
            {{ priorityLabel(report.priority) }}
          </span>
        </div>
      </div>

      <div class="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-start justify-between gap-4 mb-2">
            <div class="flex items-center gap-2">
              <span class="text-fg-muted text-xs font-medium text-numeric">
                #{{ report.id.slice(0, 8) }}
              </span>
              <span
                v-if="report.priority"
                class="badge hidden @md:inline-flex"
                :class="priorityClass(report.priority)"
              >
                {{ priorityLabel(report.priority) }}
              </span>
            </div>
            <span class="badge" :class="statusClass">
              <span
                class="size-1.5 rounded-full"
                :class="statusDotClass"
                aria-hidden="true"
              />
              {{ statusLabel }}
            </span>
          </div>

          <p class="text-fg-muted text-sm line-clamp-2">
            {{ report.description }}
          </p>
        </div>

        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <UiUserAvatar :user="report.user" size="sm" class="shrink-0" />
            <span class="text-xs font-medium text-fg-muted truncate">
              {{ reporterName }}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <p class="text-xs text-fg-muted hidden @md:block">
              {{ formatDate(report.created_at) }}
            </p>
            <!-- Primary target: ::after stretches over the whole card. -->
            <button
              type="button"
              class="rounded text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"
              @click="emit('view', report)"
            >
              {{ t('common.viewDetails') }}
            </button>
          </div>
        </div>

        <div
          v-if="isOwner && !report.solved_at"
          class="relative z-10 flex justify-end pt-2 border-t border-line"
        >
          <UiButton variant="primary" size="sm" @click="handleMarkSolved">
            <Icon
              name="heroicons:check"
              class="w-4 h-4 mr-1"
              aria-hidden="true"
            />
            {{ t('reports.markAsSolved') }}
          </UiButton>
        </div>
      </div>
    </div>
  </UiCard>
</template>
