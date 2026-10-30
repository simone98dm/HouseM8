<script lang="ts" setup>
/**
 * ReportCreateModal - Modal wrapper for the report creation form.
 * Delegates all form state to ReportForm via ref.
 */

import type { House } from '~/types';

interface ReportCreateModalProps {
  show: boolean;
  house?: House | null;
  isLoading?: boolean;
}

const {
  show,
  house = null,
  isLoading = false,
} = defineProps<ReportCreateModalProps>();

interface ReportCreateModalEvents {
  close: [];
  submit: [data: { house_id: string; description: string; images: File[] }];
}

const emit = defineEmits<ReportCreateModalEvents>();

const { t } = useI18n();

const formRef = ref<{ resetForm: () => void } | null>(null);

const handleSubmit = (data: { description: string; images: File[] }) => {
  if (!house?.id) return;
  emit('submit', {
    house_id: house.id,
    description: data.description,
    images: data.images,
  });
};

const handleClose = () => {
  formRef.value?.resetForm();
  emit('close');
};

watch(
  () => show,
  (newValue) => {
    if (!newValue) formRef.value?.resetForm();
  },
);
</script>

<template>
  <UiModal
    :show="show"
    :title="t('reports.createReport')"
    max-width="max-w-2xl"
    @close="handleClose"
  >
    <ReportForm
      ref="formRef"
      :house-name="house?.name"
      :is-loading="isLoading"
      @submit="handleSubmit"
      @cancel="handleClose"
    />
  </UiModal>
</template>
