<script setup lang="ts">
import type { BillDocument } from '~/types';

interface BillDocumentsListProps {
  documents: BillDocument[];
  canDelete: boolean;
  getFileIcon: (filename: string) => string;
  formatDate: (date: string) => string;
}

defineProps<BillDocumentsListProps>();

interface BillDocumentListEvents {
  download: [doc: BillDocument];
  view: [doc: BillDocument];
  delete: [doc: BillDocument];
  upload: [];
}

const emit = defineEmits<BillDocumentListEvents>();

const { t: $t } = useI18n();
</script>

<template>
  <div>
    <div v-if="documents && documents.length > 0" class="space-y-2">
      <div
        v-for="document in documents"
        :key="document.id"
        class="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-line-control hover:bg-surface-hover transition-colors cursor-pointer group"
      >
        <div
          class="size-10 rounded bg-brand-subtle flex items-center justify-center text-brand shrink-0"
        >
          <Icon
            :name="getFileIcon(document.filename)"
            class="w-5 h-5"
            aria-hidden="true"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-fg truncate">
            {{ document.filename }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ $t('bills.details.uploadedBy') }}
            {{ formatDate(document.uploaded_at) }}
          </p>
        </div>

        <!-- Actions. Raw: bespoke tiny icon-only row actions (p-2, no
             border/bg) revealed on row hover — UiButton's padding/variant
             backgrounds don't fit this compact hover-reveal pattern. -->
        <!-- Hover-reveal is desktop-only and must keep the focus-within
             fallback. Previously `opacity-0 group-hover:opacity-100`: on a
             touch device there is no hover, so download/delete were
             permanently invisible, and keyboard focus landed on an invisible
             control (WCAG 2.4.7). -->
        <div
          class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
        >
          <button
            type="button"
            class="p-2 rounded-lg text-fg-muted hover:text-brand hover:bg-brand-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :aria-label="`${$t('a11y.buttons.uploadDocument')} ${document.filename}`"
            @click="emit('download', document)"
          >
            <Icon
              name="heroicons:arrow-down-tray"
              class="w-4 h-4"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="p-2 rounded-lg text-fg-muted hover:text-brand hover:bg-brand-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :aria-label="`${$t('a11y.buttons.viewDocument')} ${document.filename}`"
            @click="emit('view', document)"
          >
            <Icon name="heroicons:eye" class="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="p-2 rounded-lg text-fg-muted hover:text-danger-fg hover:bg-danger-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :aria-label="`${$t('a11y.buttons.deleteDocument')} ${document.filename}`"
            @click="emit('delete', document)"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <div
        class="size-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3"
      >
        <Icon
          name="heroicons:document"
          class="w-5 h-5 text-fg-muted"
          aria-hidden="true"
        />
      </div>
      <h3 class="text-sm font-bold text-fg mb-1">
        {{ $t('bills.details.noDocuments') }}
      </h3>
      <p class="text-xs text-fg-muted mb-4">
        {{ $t('bills.details.uploadInstructions') }}
      </p>
      <UiButton size="sm" icon="document-plus" @click="emit('upload')">
        {{ $t('bills.details.uploadDocument') }}
      </UiButton>
    </div>
  </div>
</template>
