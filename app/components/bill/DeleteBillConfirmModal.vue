<script lang="ts" setup>
/**
 * BillDeleteBillConfirmModal — confirmation step before deleting the whole
 * bill (destructive, includes payment history/documents). Pure
 * presentation; the page owns the actual delete call and loading state.
 */
interface Props {
  show: boolean;
  deleting?: boolean;
  description?: string;
}

interface Events {
  confirm: [];
  cancel: [];
}

const { show, deleting = false, description } = defineProps<Props>();
const emit = defineEmits<Events>();
</script>

<template>
  <UiConfirmModal
    :show="show"
    :title="$t('bills.delete.title')"
    :message="$t('bills.delete.confirmMessage', { description })"
    :confirm-text="$t('common.delete')"
    confirm-variant="danger"
    :loading="deleting"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
    @close="emit('cancel')"
  >
    <div class="state-card state-card--error items-center">
      <div class="state-card-icon-chip state-card-icon-chip--error">
        <Icon
          name="heroicons:exclamation-triangle"
          class="w-4 h-4"
          aria-hidden="true"
        />
      </div>
      <div>
        <p class="font-semibold">
          {{ $t('bills.delete.warning') }}
        </p>
        <p class="text-sm mt-0.5">
          {{ $t('bills.delete.description') }}
        </p>
      </div>
    </div>
  </UiConfirmModal>
</template>
