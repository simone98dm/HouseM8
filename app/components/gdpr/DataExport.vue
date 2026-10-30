<script setup lang="ts">
import { EXPORT_RATE_LIMITED, saveBlob } from '~/utils/download';

const { t } = useI18n();
const userStore = useUserStore();

const isLoading = ref(false);
const errorKey = ref('');
const isDone = ref(false);

// Saves the server's file untouched: the export is the portability artifact
// (Art. 20), so the client must not re-serialize or reshape it.
async function download() {
  isLoading.value = true;
  errorKey.value = '';
  isDone.value = false;
  const { data, error } = await userStore.exportData();
  isLoading.value = false;
  if (error || !data) {
    errorKey.value =
      error === EXPORT_RATE_LIMITED
        ? 'errors.tooManyRequestsMessage'
        : 'gdpr.exportFailed';
    return;
  }
  saveBlob(data.blob, data.filename);
  isDone.value = true;
}
</script>

<template>
  <UiCard>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <h3 class="font-semibold text-fg">{{ t('gdpr.exportTitle') }}</h3>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('gdpr.exportDescription') }}
        </p>
      </div>
      <UiButton
        type="button"
        variant="primary"
        :disabled="isLoading"
        :loading="isLoading"
        :aria-busy="isLoading"
        @click="download"
      >
        {{ isLoading ? t('gdpr.exportGenerating') : t('gdpr.downloadJson') }}
      </UiButton>
    </div>
    <p v-if="errorKey" class="mt-3 text-sm text-danger-fg" role="alert">
      {{ t(errorKey) }}
    </p>
    <!-- Persistent live region: announces the finished download (4.1.3). -->
    <p role="status" class="sr-only">
      {{ isDone ? t('gdpr.exportReady') : '' }}
    </p>
  </UiCard>
</template>
