<script lang="ts" setup>
const { t } = useI18n();

interface UploadDocumentFileListProps {
  files: File[];
  disabled?: boolean;
}

const { files, disabled = false } = defineProps<UploadDocumentFileListProps>();

interface Emits {
  remove: [index: number];
  upload: [];
}

defineEmits<Emits>();

const { locale } = useI18n();

const formatFileSize = (bytes: number): string => {
  const isMb = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(locale.value, {
    style: 'unit',
    unit: isMb ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(isMb ? bytes / (1024 * 1024) : bytes / 1024);
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'heroicons:document-text';
    case 'doc':
    case 'docx':
      return 'heroicons:document';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'heroicons:photo';
    default:
      return 'heroicons:document';
  }
};
</script>

<template>
  <div class="space-y-2">
    <p class="text-sm font-medium text-fg">
      {{ t('common.selectedFiles') }} ({{ files.length }})
    </p>

    <div class="space-y-2">
      <div
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="flex items-center gap-3 p-3 bg-surface border border-line rounded-card hover:bg-surface-hover transition-colors"
      >
        <div
          class="w-10 h-10 bg-surface-raised rounded-control flex items-center justify-center shrink-0"
        >
          <Icon
            :name="getFileIcon(file.name)"
            class="w-5 h-5 text-brand"
            aria-hidden="true"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-fg truncate">
            {{ file.name }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ formatFileSize(file.size) }}
          </p>
        </div>

        <!-- Raw: bespoke tiny icon-only row action (p-2), same hover-reveal
             list-row pattern kept raw in bill/DocumentsList.vue. -->
        <button
          type="button"
          :aria-label="t('common.removeItem', { label: file.name })"
          class="inline-flex size-11 items-center justify-center text-fg-muted hover:text-danger-fg hover:bg-danger-subtle rounded-control transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:size-8"
          :disabled="disabled"
          @click.stop="$emit('remove', index)"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="flex justify-end pt-2">
      <UiButton
        icon="arrow-up-tray"
        :disabled="disabled || files.length === 0"
        @click="$emit('upload')"
      >
        {{
          files.length === 1 ? t('common.uploadFile') : t('common.uploadFiles')
        }}
      </UiButton>
    </div>
  </div>
</template>
