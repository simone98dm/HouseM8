<script lang="ts" setup>
/**
 * UiConfirmModal - The one confirmation dialog: every "are you sure" step
 * renders through it so actions sit in the same place everywhere.
 * Props: show, title, message, confirmText, cancelText
 * Slot: default, for context beyond the message (e.g. a warning card).
 * Emits: confirm, cancel, close
 */
const { t } = useI18n();

interface UiConfirmModalProps {
  show: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  confirmVariant?: 'primary' | 'danger';
}

const {
  show,
  title,
  message = undefined,
  confirmText,
  cancelText,
  loading = false,
  confirmVariant = 'primary',
} = defineProps<UiConfirmModalProps>();

interface ConfirmModalEvents {
  confirm: [];
  cancel: [];
  close: [];
}

const emit = defineEmits<ConfirmModalEvents>();

// Computed properties for i18n fallbacks
const displayTitle = computed(() => title || t('common.areYouSure'));
const displayConfirmText = computed(() => confirmText || t('common.confirm'));
const displayCancelText = computed(() => cancelText || t('common.cancel'));
</script>
<template>
  <UiModal
    :show="show"
    :title="displayTitle"
    max-width="max-w-sm"
    :role="confirmVariant === 'danger' ? 'alertdialog' : 'dialog'"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <slot />
      <p v-if="message" class="text-sm text-fg-muted">
        {{ message }}
      </p>
    </div>
    <template #footer>
      <UiButton variant="secondary" :disabled="loading" @click="emit('cancel')">
        {{ displayCancelText }}
      </UiButton>
      <UiButton
        :variant="confirmVariant"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ displayConfirmText }}
      </UiButton>
    </template>
  </UiModal>
</template>
