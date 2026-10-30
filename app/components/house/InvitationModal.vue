<script lang="ts" setup>
/**
 * HouseInvitationModal — "Invite someone": the one entry point for adding a
 * housemate, with its two ways in (send an email, or share a join code).
 */

import type { JoinCode } from '~/types';

interface HouseInvitationModalProps {
  show: boolean;
  inviteLoading?: boolean;
  actionError?: string | null;
  joinCode: JoinCode | null;
  joinCodeLoading?: boolean;
  joinCodeGenerating?: boolean;
  joinCodeHasError?: boolean;
}

interface HouseInvitationModalEvents {
  close: [];
  'invite-member': [email: string];
  'generate-code': [];
  'copy-code': [];
}

const {
  show,
  inviteLoading = false,
  actionError = null,
  joinCode,
  joinCodeLoading = false,
  joinCodeGenerating = false,
  joinCodeHasError = false,
} = defineProps<HouseInvitationModalProps>();
const emit = defineEmits<HouseInvitationModalEvents>();

const { t } = useI18n();

const email = ref('');

const submit = () => {
  const value = email.value.trim();
  if (!value) return;
  emit('invite-member', value);
};

// Clear the field once the in-flight request settles successfully; keep it on
// error so the user doesn't have to retype it.
watch(
  () => inviteLoading,
  (loading, wasLoading) => {
    if (wasLoading && !loading && !actionError) email.value = '';
  },
);
</script>

<template>
  <UiModal
    :show="show"
    :title="t('houseProfile.invite.title')"
    @close="emit('close')"
  >
    <div class="space-y-6">
      <p class="text-sm text-fg-muted">
        {{ t('houseProfile.invite.intro') }}
      </p>

      <form class="space-y-3" @submit.prevent="submit">
        <h3 class="flex items-center gap-2 text-base font-semibold text-fg">
          <Icon
            name="heroicons:envelope"
            class="size-5 text-fg-muted"
            aria-hidden="true"
          />
          {{ t('houseProfile.invite.emailTitle') }}
        </h3>
        <p class="text-sm text-fg-muted">
          {{ t('houseProfile.invite.emailHint') }}
        </p>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <UiInput
            id="house-invite-email"
            v-model="email"
            type="email"
            required
            class="min-w-0 flex-1"
            :label="t('houseProfile.inviteByEmailLabel')"
          />
          <UiButton type="submit" variant="primary" :loading="inviteLoading">
            {{ t('houseProfile.inviteByEmailSubmit') }}
          </UiButton>
        </div>
        <p v-if="actionError" role="alert" class="text-sm text-danger-fg">
          {{ actionError }}
        </p>
      </form>

      <hr class="border-line" />

      <HouseJoinCodeCard
        :join-code="joinCode"
        :loading="joinCodeLoading"
        :generating="joinCodeGenerating"
        :has-error="joinCodeHasError"
        @generate="emit('generate-code')"
        @copy="emit('copy-code')"
      />
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">
        {{ t('common.close') }}
      </UiButton>
    </template>
  </UiModal>
</template>
