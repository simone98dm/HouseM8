<script setup lang="ts">
interface Props {
  houseId: string;
}
const { houseId } = defineProps<Props>();

const { t: $t } = useI18n();
const { formatMonthName } = useDate();
const { isEnabled } = useFeatureFlags();
const isStripeEnabled = isEnabled('showStripe');

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() === 0 ? 12 : now.getMonth());
const downloading = ref(false);
const errorMsg = ref('');

const monthOptions = computed(() => {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push({
      value: m,
      label: formatMonthName(new Date(2000, m - 1, 1)),
    });
  }
  return months;
});

const currentYearOptions = computed(() => {
  const year = now.getFullYear();
  return [year - 1, year].map((y) => ({ value: y, label: String(y) }));
});

const handleDownload = async () => {
  errorMsg.value = '';
  downloading.value = true;

  try {
    const response = await $fetch<Blob>(
      `/api/expenses/monthly-report?house_id=${houseId}&year=${selectedYear.value}&month=${selectedMonth.value}`,
      { responseType: 'blob' },
    );

    const url = URL.createObjectURL(response);
    const a = document.createElement('a');
    a.href = url;
    a.download = `house-m8-report-${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    errorMsg.value = $t('errors.downloadReportFailed');
  } finally {
    downloading.value = false;
  }
};
</script>

<template>
  <UiCard v-if="isStripeEnabled">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="inline-flex items-center justify-center size-9 rounded-lg bg-brand-subtle text-brand-hover"
        >
          <Icon
            name="heroicons:document-chart-bar"
            class="w-5 h-5"
            aria-hidden="true"
          />
        </div>
        <h2 class="text-base font-semibold text-fg">
          {{ $t('expenses.monthlyReport') }}
        </h2>
      </div>
    </template>

    <SubscriptionPlanGate required-plan="pro">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-3">
          <UiSelect
            id="report-month"
            v-model="selectedMonth"
            :label="$t('common.month')"
            :options="monthOptions"
          />
          <UiSelect
            id="report-year"
            v-model="selectedYear"
            :label="$t('common.year')"
            :options="currentYearOptions"
          />
        </div>

        <div v-if="errorMsg" class="text-sm text-danger-fg" role="alert">
          {{ errorMsg }}
        </div>

        <UiButton
          :loading="downloading"
          icon="arrow-down-tray"
          @click="handleDownload"
        >
          {{ $t('expenses.downloadReport') }}
        </UiButton>
      </div>
    </SubscriptionPlanGate>
  </UiCard>
</template>
