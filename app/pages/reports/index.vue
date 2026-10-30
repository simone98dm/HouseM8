<script lang="ts" setup>
/**
 * Reports Page — Orchestration only.
 * - Regular users: view their own reports
 * - House owners: view all tenant reports + mark solved
 */

import type { Report, ReportStatus } from '~/types';

const { t } = useI18n();

useSeoMeta({ title: t('seo.titles.reports') });

const housesStore = useHousesStore();
const reportsStore = useReportsStore();
const notificationStore = useNotificationStore();

const currentHouse = computed(() => housesStore.currentHouse);
const isOwner = computed(() => housesStore.isOwner);
const reports = computed(() => reportsStore.reports);
const isLoading = computed(() => reportsStore.isLoading);

const showCreateModal = ref(false);
const isSubmitting = ref(false);
const currentFilter = ref<ReportStatus | undefined>(undefined);

const filterCounts = computed(() => {
  const all = reports.value;
  return {
    all: all.length,
    not_read: all.filter((r) => !r.read_at).length,
    read: all.filter((r) => r.read_at && !r.solved_at).length,
    solved: all.filter((r) => !!r.solved_at).length,
  };
});

const displayedReports = computed(() => {
  if (!currentFilter.value) return reports.value;
  return reports.value.filter((report) => {
    if (currentFilter.value === 'solved') return !!report.solved_at;
    if (currentFilter.value === 'read')
      return !!report.read_at && !report.solved_at;
    if (currentFilter.value === 'not_read') return !report.read_at;
    return true;
  });
});

onMounted(() => reportsStore.loadReports());

const handleViewReport = async (report: Report) => {
  if (!isOwner.value) return;
  try {
    await reportsStore.markReportAsRead(report.id);
  } catch {
    notificationStore.error('errors.generic', 'errors.generic');
  }
};

const handleMarkSolved = (reportId: string) =>
  reportsStore.markReportAsSolved(reportId);

const handleCreateReport = async (data: {
  house_id: string;
  description: string;
  images: File[];
}) => {
  isSubmitting.value = true;
  const success = await reportsStore.createReport(data);
  if (success) showCreateModal.value = false;
  isSubmitting.value = false;
};

const canCreateReport = computed(() => currentHouse.value && !isOwner.value);
</script>

<template>
  <AppPageHeader
    :title="t('reports.title')"
    :meta="isOwner ? t('reports.ownerDescription') : t('reports.subtitle')"
  >
    <template #actions>
      <!-- ClientOnly is load-bearing: `canCreateReport` reads store state that
           does not exist during SSR, so the server rendered a placeholder and
           the client rendered a <button> — a hydration mismatch. The v-if stays
           inside. Do not hoist it back onto the <template>. -->
      <ClientOnly>
        <UiButton
          v-if="canCreateReport"
          variant="primary"
          icon="plus"
          class="max-md:hidden"
          @click="showCreateModal = true"
        >
          {{ t('reports.newReport') }}
        </UiButton>
      </ClientOnly>
    </template>
  </AppPageHeader>

  <div class="space-y-6">
    <ReportFilterBar
      v-if="reports.length > 0"
      v-model="currentFilter"
      :counts="filterCounts"
      class="mb-6"
    />

    <UiCard v-if="isLoading" padding="none" role="status">
      <span class="sr-only">{{ $t('common.loading') }}</span>
      <ul class="divide-y divide-line" aria-hidden="true">
        <li v-for="n in 3" :key="n" class="space-y-2 px-4 py-4 sm:px-5">
          <UiSkeleton class="h-4 w-48" />
          <UiSkeleton class="h-3 w-full max-w-md" />
          <UiSkeleton class="h-3 w-24" />
        </li>
      </ul>
    </UiCard>

    <UiEmptyState
      v-else-if="reports.length === 0"
      icon="heroicons:wrench-screwdriver"
      :title="t('reports.empty.title')"
      :description="
        isOwner
          ? t('reports.empty.ownerDescription')
          : t('reports.empty.userDescription')
      "
    >
      <template #illustration><SpotClipboard /></template>
      <!-- ClientOnly load-bearing — same SSR store-state reason as above. -->
      <template #action>
        <ClientOnly>
          <UiButton
            v-if="canCreateReport"
            variant="primary"
            @click="showCreateModal = true"
          >
            {{ t('reports.createFirstReport') }}
          </UiButton>
        </ClientOnly>
      </template>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="displayedReports.length === 0"
      icon="heroicons:funnel"
      :title="t('reports.noFilterResults')"
      :description="t('reports.tryDifferentFilter')"
    />

    <div v-else class="space-y-4">
      <ReportCard
        v-for="report in displayedReports"
        :key="report.id"
        :report="report"
        :is-owner="isOwner"
        @view="handleViewReport"
        @mark-solved="handleMarkSolved"
      />
    </div>
  </div>

  <ClientOnly>
    <UiFab
      v-if="canCreateReport && !isLoading"
      :label="t('reports.newReport')"
      @click="showCreateModal = true"
    />
  </ClientOnly>

  <LazyReportCreateModal
    :show="showCreateModal"
    :house="currentHouse"
    :is-loading="isSubmitting"
    @close="showCreateModal = false"
    @submit="handleCreateReport"
  />
</template>
