<script lang="ts" setup>
/**
 * BillDeleteDocumentConfirmModal — confirmation step before deleting a
 * document from the bill. Pure presentation, no fetch/store access; the
 * page owns which document is targeted and what "confirm" actually does
 * (currently the deliberate upload/delete stub — see [id].vue).
 */
interface Props {
  show: boolean;
}

interface Events {
  confirm: [];
  cancel: [];
}

defineProps<Props>();
const emit = defineEmits<Events>();
</script>

<template>
  <UiConfirmModal
    :show="show"
    :title="$t('bills.details.deleteDocumentTitle')"
    :message="$t('bills.details.deleteDocumentConfirm')"
    :confirm-text="$t('common.delete')"
    confirm-variant="danger"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
    @close="emit('cancel')"
  />
</template>
