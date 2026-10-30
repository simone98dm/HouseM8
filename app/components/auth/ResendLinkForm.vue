<script lang="ts" setup>
// "Send the link again" for a sign-up that was never confirmed. With `email`
// (register's success state) it is one button; without it (an expired link,
// where the page cannot know the address) it asks for the email first.
// The server answers the same for every address, so the confirmation copy
// never says whether an account exists.
interface ResendLinkFormProps {
  email?: string;
}

const { email = '' } = defineProps<ResendLinkFormProps>();

const { t } = useI18n();
const userStore = useUserStore();

const fieldId = useId();
const address = ref(email);
const sending = ref(false);
const sent = ref(false);
const error = ref('');

const send = async () => {
  if (sending.value) return;
  if (!address.value.trim()) {
    error.value = t('auth.resend.emailRequired');
    await nextTick();
    document.getElementById(fieldId)?.focus();
    return;
  }
  sending.value = true;
  error.value = '';
  sent.value = false;
  try {
    const result = await userStore.resendConfirmation(address.value.trim());
    if (result.success) sent.value = true;
    else error.value = t(result.error ?? 'auth.errors.resendFailed');
  } finally {
    sending.value = false;
  }
};
</script>

<template>
  <form class="auth-form w-full" novalidate @submit.prevent="send">
    <UiInput
      v-if="!email"
      :id="fieldId"
      v-model="address"
      type="email"
      :label="t('auth.resend.email')"
      autocomplete="email"
      required
      :disabled="sending"
      :error="Boolean(error)"
      :hint="error || undefined"
    >
      <template #icon><AuthIconEmail /></template>
    </UiInput>
    <p v-else-if="error" class="auth-alert auth-alert-error" role="alert">
      <AuthIconAlert />
      {{ error }}
    </p>

    <UiButton
      type="submit"
      :variant="email ? 'secondary' : 'primary'"
      size="lg"
      full-width
      :loading="sending"
    >
      {{ sending ? t('auth.resend.sending') : t('auth.resend.button') }}
    </UiButton>

    <!-- Always mounted so the confirmation is announced when it appears. -->
    <p role="status" class="text-sm text-fg-muted">
      {{ sent ? t('auth.resend.sent', { email: address.trim() }) : '' }}
    </p>
  </form>
</template>
