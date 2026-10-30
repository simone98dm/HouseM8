<script lang="ts" setup>
const { t: $t } = useI18n();
const { formatDate } = useBillDetails();

useSeoMeta({
  title: () => $t('seo.titles.billDetails'),
});

const {
  bill,
  loading,
  showUploadModal,
  showEditModal,
  uploading,
  showDeleteConfirm,
  showDeleteBillConfirm,
  deletingBill,
  showAdvanceConfirm,
  advancingBill,
  nextAdvancedDueDate,
  isCreator,
  canDeleteDocument,
  handleDocumentUpload,
  viewDocument,
  downloadDocument,
  confirmDeleteDocument,
  deleteDocument,
  deleteBill,
  handleAdvanceBill,
  handleBillUpdated,
  goToBills,
} = useBillDetailsPage();
</script>

<template>
  <AppPageHeader
    allow-back
    back-to="/bills"
    :title="bill?.description || $t('navigation.bills')"
  />

  <UiContainer v-if="loading" class="space-y-6" role="status">
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <div
      class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8"
      aria-hidden="true"
    >
      <div class="space-y-6 lg:col-span-2">
        <UiCard>
          <UiSkeleton class="h-5 w-40" />
          <div class="mt-4 space-y-3">
            <UiSkeleton v-for="n in 4" :key="n" class="h-4 w-full max-w-sm" />
          </div>
        </UiCard>
        <UiCard>
          <UiSkeleton class="h-5 w-32" />
          <div class="mt-4 space-y-3">
            <UiSkeleton v-for="n in 3" :key="n" class="h-4 w-full max-w-sm" />
          </div>
        </UiCard>
      </div>
      <UiCard>
        <UiSkeleton class="h-5 w-28" />
        <UiSkeleton class="mt-4 h-10 w-full" />
      </UiCard>
    </div>
  </UiContainer>

  <UiContainer v-else-if="!bill">
    <UiEmptyState
      icon="heroicons:document"
      :title="$t('bills.details.notFound')"
      :description="$t('bills.notFoundDesc')"
    >
      <template #action>
        <UiButton icon="arrow-left" @click="goToBills">
          {{ $t('bills.details.backToBills') }}
        </UiButton>
      </template>
    </UiEmptyState>
  </UiContainer>

  <UiContainer v-else>
    <div v-if="isCreator" class="mb-6 flex flex-wrap items-center gap-2">
      <UiButton
        variant="secondary"
        size="sm"
        icon="pencil"
        @click="showEditModal = true"
      >
        {{ $t('common.edit') }}
      </UiButton>
      <UiButton
        variant="secondary"
        size="sm"
        icon="forward"
        :aria-label="
          $t('bills.details.advanceDueDateLabel', {
            description: bill.description,
          })
        "
        @click="showAdvanceConfirm = true"
      >
        {{ $t('bills.details.advanceDueDate') }}
      </UiButton>
      <UiButton
        variant="danger"
        outline
        size="sm"
        icon="trash"
        :loading="deletingBill"
        @click="showDeleteBillConfirm = true"
      >
        {{ $t('common.delete') }}
      </UiButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div class="lg:col-span-2 space-y-6">
        <BillBasicInfo :bill="bill" />
        <BillContractInfo :bill="bill" />
      </div>

      <div class="space-y-6">
        <BillDetailsDocuments
          :documents="bill.documents || []"
          :can-delete="canDeleteDocument"
          @view="viewDocument"
          @download="downloadDocument"
          @delete="confirmDeleteDocument"
          @upload="showUploadModal = true"
        />
      </div>
    </div>
  </UiContainer>

  <UiModal
    :show="showUploadModal"
    :title="$t('bills.details.uploadDocument')"
    @close="showUploadModal = false"
  >
    <UiUploadDocument
      multiple
      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      :max-size="10"
      :disabled="uploading"
      @upload="handleDocumentUpload"
    />
  </UiModal>

  <BillDeleteDocumentConfirmModal
    :show="showDeleteConfirm"
    @confirm="deleteDocument"
    @cancel="showDeleteConfirm = false"
  />

  <BillDeleteBillConfirmModal
    :show="showDeleteBillConfirm"
    :deleting="deletingBill"
    :description="bill?.description"
    @confirm="deleteBill"
    @cancel="showDeleteBillConfirm = false"
  />

  <UiConfirmModal
    :show="showAdvanceConfirm"
    :title="$t('bills.details.advanceConfirmTitle')"
    :message="
      bill && nextAdvancedDueDate
        ? $t('bills.details.advanceConfirmMessage', {
            from: formatDate(bill.next_due_date),
            to: formatDate(nextAdvancedDueDate),
          })
        : undefined
    "
    :confirm-text="$t('bills.details.advanceConfirmButton')"
    :cancel-text="$t('common.cancel')"
    :loading="advancingBill"
    @confirm="handleAdvanceBill"
    @cancel="showAdvanceConfirm = false"
    @close="showAdvanceConfirm = false"
  />

  <!-- Edit Bill Modal. No `v-if` alongside `:show` — see the note in
       pages/expenses/index.vue: an outer v-if skips both animations. -->
  <LazyBillEditModal
    :show="showEditModal"
    :bill="bill"
    @close="showEditModal = false"
    @submit="handleBillUpdated"
  />
</template>
