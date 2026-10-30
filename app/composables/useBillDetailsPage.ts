import type { BillDocument, UpdateBillPayload } from '~/types';

/**
 * Owns the /bills/[id] page's state and actions: loading the bill (mount +
 * house-switch), the creator-only edit/delete flows, and the document
 * upload/delete flows. Extracted from [id].vue so the page's script stays
 * focused on rendering the resulting states.
 *
 * The document upload/delete handlers are deliberate stubs — no upload
 * backend was ever built, so they always toast a failure. That is
 * intentional and tracked separately; do not "fix" it here.
 */
export function useBillDetailsPage() {
  const { t: $t } = useI18n();
  const route = useRoute();
  const userStore = useUserStore();
  const housesStore = useHousesStore();
  const billsStore = useBillsStore();

  const currentHouse = computed(() => housesStore.currentHouse);
  const bill = computed(() => billsStore.currentBill);
  const loading = computed(() => billsStore.isLoading);

  const notificationStore = useNotificationStore();
  const showUploadModal = ref(false);
  const showEditModal = ref(false);
  const uploading = ref(false);
  const showDeleteConfirm = ref(false);
  const documentToDelete = ref<BillDocument | null>(null);
  const showDeleteBillConfirm = ref(false);
  const deletingBill = ref(false);
  const showAdvanceConfirm = ref(false);
  const advancingBill = ref(false);

  const isCreator = computed(
    () =>
      !!(
        userStore.currentUser &&
        bill.value &&
        bill.value.created_by === userStore.currentUser.id
      ),
  );

  const canDeleteDocument = computed(
    () =>
      !!(
        userStore.currentUser &&
        bill.value?.created_by === userStore.currentUser.id
      ),
  );

  // What "advance" actually does: shifts next_due_date forward by one
  // payment_period (months), mirroring the server's own date math
  // (server/repositories/postgres/PostgresBillRepository.ts#advanceDueDate)
  // so the confirmation modal can state the real before/after date rather
  // than a vague "advance the due date?". Built from UTC date parts (not
  // `new Date(str)` + setMonth) so the result doesn't drift a day depending
  // on the browser's local timezone — the server's DATE arithmetic has no
  // timezone at all.
  const nextAdvancedDueDate = computed(() => {
    if (!bill.value) return null;
    const [year, month, day] = bill.value.next_due_date.split('-').map(Number);
    if (!year || !month || !day) return null;
    const advanced = new Date(
      Date.UTC(year, month - 1 + bill.value.payment_period, day),
    );
    return advanced.toISOString().slice(0, 10);
  });

  const showError = (message: string) => {
    // Shared toast container (never overlaps the bottom nav); message is
    // already translated.
    notificationStore.error($t('common.error'), message, { i18n: false });
  };

  // Document handlers
  const handleDocumentUpload = async (_files: File[]) => {
    if (!bill.value || !userStore.currentUser || uploading.value) return;
    uploading.value = true;
    try {
      showError($t('errors.uploadNotAvailable'));
      showUploadModal.value = false;
    } catch {
      showError($t('errors.uploadFailed'));
    } finally {
      uploading.value = false;
    }
  };

  const viewDocument = (document: BillDocument) => {
    if (import.meta.client) globalThis.open(document.url, '_blank');
  };

  const downloadDocument = (doc: BillDocument) => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.filename;
    link.click();
  };

  const confirmDeleteDocument = (document: BillDocument) => {
    documentToDelete.value = document;
    showDeleteConfirm.value = true;
  };

  const deleteDocument = async () => {
    if (!documentToDelete.value) return;
    try {
      showError($t('errors.deleteNotAvailable'));
      showDeleteConfirm.value = false;
      documentToDelete.value = null;
    } catch {
      showError($t('errors.deleteFailed'));
    }
  };

  // Bill handlers
  const deleteBill = async () => {
    if (!bill.value || deletingBill.value) return;
    deletingBill.value = true;
    try {
      await billsStore.deleteBill(bill.value.id);
      await navigateTo('/bills');
    } catch {
      // Error handled by store
    } finally {
      deletingBill.value = false;
      showDeleteBillConfirm.value = false;
    }
  };

  // advanceDueDate is not idempotent server-side (each call shifts the date
  // forward by another payment_period), so the loading guard below is not
  // just a spinner — it's what stops a double-click from advancing twice.
  // The confirm modal stays open (loading) for the same reason the delete
  // modal does: closing it early would let a second click queue a second
  // request before the first one lands.
  const handleAdvanceBill = async () => {
    if (!bill.value || advancingBill.value) return;
    advancingBill.value = true;
    try {
      await billsStore.advanceBill(bill.value.id);
    } catch {
      // Error handled by store
    } finally {
      advancingBill.value = false;
      showAdvanceConfirm.value = false;
    }
  };

  const handleBillUpdated = async (payload: UpdateBillPayload) => {
    if (!bill.value) return;
    try {
      await billsStore.updateBill(bill.value.id, payload);
      showEditModal.value = false;
    } catch {
      // Error handled by store
    }
  };

  const goToBills = () => {
    navigateTo('/bills');
  };

  const billId = computed(() => route.params.id as string);

  onMounted(async () => {
    await housesStore.initialize();
    if (currentHouse.value && billId.value) {
      await billsStore.loadBill(billId.value);
    }
  });

  watch(currentHouse, async (newHouse) => {
    if (newHouse && billId.value) {
      await billsStore.loadBill(billId.value);
    }
  });

  return {
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
  };
}
