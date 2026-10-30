<script setup lang="ts">
const { t, locale } = useI18n();

interface PictureUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  error?: string;
  disabled?: boolean;
}

const {
  label = '',
  accept = 'image/*',
  maxSize = 5,
  error = '',
  disabled = false,
} = defineProps<PictureUploadProps>();

const modelValue = defineModel<File | null>({ required: true });

const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
// Client-side validation feedback. `error` (prop) carries server/parent-side
// errors; `localError` covers invalid drops/selects caught here, which
// previously were dropped with the file and no message at all (WCAG 3.3.1
// Error Identification — an invalid file must not vanish silently).
const localError = ref('');
const displayError = computed(() => localError.value || error);

// Computed label with i18n fallback
const displayLabel = computed(() => label || t('common.clickToUpload'));

const previewUrl = computed(() => {
  if (modelValue.value) {
    return URL.createObjectURL(modelValue.value);
  }
  return null;
});

const fileName = computed(() => {
  return modelValue.value?.name || '';
});

const formatMegabytes = (megabytes: number) =>
  new Intl.NumberFormat(locale.value, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1,
  }).format(megabytes);

const fileSize = computed(() =>
  modelValue.value
    ? formatMegabytes(modelValue.value.size / (1024 * 1024))
    : '',
);

const maxSizeLabel = computed(() => formatMegabytes(maxSize));

const isValidFile = (file: File): boolean => {
  // Check file type
  if (accept !== '*' && !file.type.match(accept)) {
    localError.value = t('common.unsupportedFileType', { fileType: file.type });
    return false;
  }

  // Check file size
  const sizeInMB = file.size / (1024 * 1024);
  if (sizeInMB > maxSize) {
    localError.value = t('common.fileTooLarge', {
      fileName: file.name,
      maxSize: maxSizeLabel.value,
    });
    return false;
  }

  return true;
};

const handleFileSelect = (file: File | null) => {
  localError.value = '';
  if (file && isValidFile(file)) {
    modelValue.value = file;
  } else if (file) {
    // Invalid file - rejected, localError now holds the reason (see isValidFile)
    modelValue.value = null;
  } else {
    modelValue.value = null;
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFileSelect(files[0] ?? null);
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (!disabled) {
    isDragOver.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
};

const handleClick = () => {
  if (!disabled && fileInput.value) {
    fileInput.value.click();
  }
};

const handleFileInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    handleFileSelect(files[0] ?? null);
  }
};

const removeFile = () => {
  modelValue.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};
</script>

<template>
  <div>
    <div v-if="previewUrl" class="mb-4">
      <div class="relative inline-block">
        <img
          :src="previewUrl"
          :alt="t('common.imagePreview')"
          class="max-w-full h-32 object-cover rounded-control border border-line"
        />
        <!-- Raw: bespoke w-6 h-6 badge pinned to the preview image's corner —
             same as the removeFile badge kept raw in report/Form.vue. -->
        <button
          type="button"
          :aria-label="t('common.removeItem', { label: fileName })"
          class="absolute -top-2 -right-2 bg-danger text-on-status rounded-full size-6 flex items-center justify-center text-sm hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          :disabled="disabled"
          @click="removeFile"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="mt-2 text-sm text-fg-muted">
        <p class="font-medium">{{ fileName }}</p>
        <p class="text-xs">{{ fileSize }}</p>
      </div>
    </div>

    <div
      class="relative border-2 border-dashed rounded-card p-8 text-center cursor-pointer transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
      :class="[
        isDragOver ? 'border-brand bg-brand-subtle' : 'border-line-control',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:border-brand hover:bg-surface-hover',
      ]"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="handleClick"
    >
      <div class="flex flex-col items-center justify-center space-y-2">
        <div class="w-12 h-12 text-fg-subtle" aria-hidden="true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            ></path>
          </svg>
        </div>
        <div class="text-fg-muted">
          <p class="text-sm font-medium">{{ displayLabel }}</p>
          <p class="text-xs text-fg-muted mt-1">
            {{
              t(
                accept === 'image/*'
                  ? 'common.pngJpgGifUpTo'
                  : 'common.filesUpTo',
                { size: maxSizeLabel },
              )
            }}
          </p>
        </div>
      </div>

      <!-- Hidden file input. Raw by design: type="file" has no text value to
           bind, no UiInput equivalent, and this one sits as a transparent
           full-area overlay so the whole drop zone stays clickable. -->
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :disabled="disabled"
        :aria-label="displayLabel"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        @change="handleFileInput"
      />
    </div>

    <!-- Error message. role="alert" so client-side validation failures
         (localError) are announced. -->
    <p v-if="displayError" class="text-xs text-danger-fg mt-2" role="alert">
      {{ displayError }}
    </p>
  </div>
</template>
