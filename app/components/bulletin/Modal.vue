<script lang="ts" setup>
import type { CreateBulletinNotePayload } from '~/types';
import { focusFirstInvalid } from '~/utils/focusFirstInvalid';

interface BulletinModalProps {
  show: boolean;
}

interface BulletinModalEvents {
  close: [];
  submit: [payload: CreateBulletinNotePayload];
}

const { show } = defineProps<BulletinModalProps>();
const emit = defineEmits<BulletinModalEvents>();

const { t } = useI18n();

const message = ref('');
const dismissDate = ref('');
const messageError = ref('');

/** Minimum selectable date is today. */
const minDate = new Date().toISOString().split('T')[0];

const handleSubmit = () => {
  if (!message.value.trim()) {
    messageError.value = t('bulletin.modal.errors.message');
    focusFirstInvalid();
    return;
  }

  const payload: CreateBulletinNotePayload = {
    message: message.value.trim(),
  };
  if (dismissDate.value) {
    payload.dismiss_date = dismissDate.value;
  }
  emit('submit', payload);
};

watch(
  () => show,
  (isShown) => {
    if (!isShown) {
      message.value = '';
      dismissDate.value = '';
      messageError.value = '';
    }
  },
);
</script>

<template>
  <UiModal
    :show="show"
    as="form"
    novalidate
    :title="t('bulletin.modal.title')"
    @close="emit('close')"
    @submit="handleSubmit"
  >
    <div class="space-y-4">
      <UiInput
        v-model="message"
        type="textarea"
        :rows="4"
        :label="t('bulletin.modal.message')"
        :placeholder="t('bulletin.modal.messagePlaceholder')"
        :error="!!messageError"
        :hint="messageError || undefined"
        required
      />

      <UiInput
        v-model="dismissDate"
        type="date"
        :min="minDate"
        :label="t('bulletin.modal.dismissDateOptional')"
        :hint="t('bulletin.modal.dismissDateHelp')"
      />
    </div>

    <template #footer>
      <UiButton type="button" variant="secondary" @click="emit('close')">
        {{ t('bulletin.modal.cancel') }}
      </UiButton>
      <UiButton type="submit">
        {{ t('bulletin.modal.post') }}
      </UiButton>
    </template>
  </UiModal>
</template>
