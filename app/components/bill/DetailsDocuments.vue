<script lang="ts" setup>
import type { BillDocument } from '~/types';

interface Props {
  documents: BillDocument[];
  canDelete: boolean;
}

const { documents, canDelete } = defineProps<Props>();

interface Emits {
  view: [document: BillDocument];
  download: [document: BillDocument];
  delete: [document: BillDocument];
  upload: [];
}

const emit = defineEmits<Emits>();

const { t: $t } = useI18n();
const { formatDate, getFileIcon } = useBillDetails();
</script>

<template>
  <UiCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-fg">
          {{ $t('bills.details.documents') }}
        </h3>
        <span class="text-xs font-medium text-fg-muted">
          {{ $t('bills.details.documentCount', documents.length) }}
        </span>
      </div>
    </template>

    <BillDocumentsList
      :documents="documents"
      :can-delete="canDelete"
      :get-file-icon="getFileIcon"
      :format-date="formatDate"
      @view="emit('view', $event)"
      @download="emit('download', $event)"
      @delete="emit('delete', $event)"
      @upload="emit('upload')"
    />

    <!-- Upload drop zone (always shown below list). Raw: a dashed-border
         zone with a stacked icon/title/subtitle, not a UiButton variant —
         UiButton has no dashed-outline style and centers content
         horizontally, not in this vertical icon-above-text stack. -->
    <button
      type="button"
      class="mt-4 w-full border-2 border-dashed border-line-control rounded-card p-6 flex flex-col items-center justify-center text-center hover:border-brand hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :aria-label="$t('a11y.buttons.uploadDocument')"
      @click="emit('upload')"
    >
      <div
        class="size-12 rounded-full bg-brand-subtle flex items-center justify-center text-brand mb-3"
      >
        <Icon
          name="heroicons:arrow-up-tray"
          class="w-5 h-5"
          aria-hidden="true"
        />
      </div>
      <p class="text-sm font-bold text-fg">
        {{ $t('bills.details.uploadButton') }}
      </p>
      <p class="text-xs text-fg-muted mt-1">
        {{ $t('bills.details.supportedFormats') }}
      </p>
    </button>
  </UiCard>
</template>
