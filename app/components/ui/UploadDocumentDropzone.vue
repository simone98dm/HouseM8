<script lang="ts" setup>
const { t, locale } = useI18n();

interface UploadDocumentDropzoneProps {
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
}

const {
  multiple = false,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSize = 10,
  disabled = false,
} = defineProps<UploadDocumentDropzoneProps>();

interface Emits {
  filesSelected: [files: File[]];
}

const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const acceptedTypes = computed(() => {
  return accept.split(',').map((type) => type.trim());
});

const acceptedTypesLabel = computed(() =>
  new Intl.ListFormat(locale.value, { style: 'narrow', type: 'unit' }).format(
    acceptedTypes.value.map((type) => type.replace(/^\./, '').toUpperCase()),
  ),
);

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target?.files || disabled) return;

  emit('filesSelected', Array.from(target.files));

  // Reset input
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const openFilePicker = () => {
  if (disabled) return;
  fileInput.value?.click();
};

// The zone is a plain <div> (needs drag/drop handlers a native <label> or
// <button> can't own cleanly), so it's mouse/touch-only without an explicit
// keyboard path: the file input it opens is `hidden` (display:none), which
// drops it from the tab order entirely, unlike PictureUpload's transparent-
// overlay input trick. role="button" + tabindex + this handler restore
// WCAG 2.1.1 Keyboard operability.
const handleZoneKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openFilePicker();
};

// Drag and drop handlers
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  if (disabled) return;
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  // Only set to false if leaving the entire drop zone
  const target = event.target as HTMLElement;
  if (target.classList.contains('upload-zone')) {
    isDragging.value = false;
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  if (disabled) return;

  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files) {
    emit('filesSelected', Array.from(files));
  }
};
</script>

<template>
  <div
    class="upload-zone relative rounded-card border-2 border-dashed border-line-control bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    :class="{
      'opacity-50 cursor-not-allowed': disabled,
      'cursor-pointer hover:border-brand': !disabled,
      'border-brand bg-brand-subtle': isDragging,
    }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    :aria-label="t('common.uploadDocuments')"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @click="openFilePicker"
    @keydown="handleZoneKeydown"
  >
    <div class="relative p-8 text-center">
      <div
        class="mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-colors"
        :class="isDragging ? 'bg-brand-subtle' : 'bg-surface-hover'"
      >
        <Icon
          name="heroicons:cloud-arrow-up"
          class="w-8 h-8 transition-colors"
          :class="isDragging ? 'text-brand' : 'text-fg-muted'"
          aria-hidden="true"
        />
      </div>

      <p
        class="text-lg font-semibold mb-2 transition-colors"
        :class="disabled ? 'text-fg-muted' : 'text-fg'"
      >
        {{
          isDragging ? t('common.dropFilesHere') : t('common.uploadDocuments')
        }}
      </p>

      <p class="text-sm text-fg-muted mb-4">
        {{
          multiple
            ? t('common.dragDropFilesOrClick')
            : t('common.dragDropFileOrClick')
        }}
      </p>

      <p class="text-xs text-fg-muted">
        {{ t('common.supportedFormats') }}
        {{ acceptedTypesLabel }}
        <span class="mx-1" aria-hidden="true">•</span>
        {{ t('common.maxSize') }}
        {{
          new Intl.NumberFormat(locale, {
            style: 'unit',
            unit: 'megabyte',
          }).format(maxSize)
        }}
      </p>

      <!-- Hidden file input. Raw by design: type="file" has no UiInput
           equivalent; this one stays display:none behind the custom
           drag/drop zone above (see handleZoneKeydown for its own
           keyboard-operability fix). -->
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        class="hidden"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>
