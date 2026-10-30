<script lang="ts" setup>
/**
 * New-password form shared by password reset and the sign-up confirmation
 * link. One field with a "Show password" switch instead of a second
 * "confirm password" field: on a phone keyboard, seeing the password beats
 * typing it twice. The length rule is shown up front, not only on failure.
 * Validates on submit (DESIGN.md): the button stays enabled; an invalid
 * field is flagged and focused. Emits the password only once it passes.
 */
interface NewPasswordFormProps {
  submitLabel: string;
  passwordLabel?: string;
  loading?: boolean;
  /** Id of a page-level error the field should be described by. */
  errorId?: string;
}

interface Events {
  submit: [password: string];
}

const {
  submitLabel,
  passwordLabel = undefined,
  loading = false,
  errorId = undefined,
} = defineProps<NewPasswordFormProps>();
const emit = defineEmits<Events>();

const { t } = useI18n();

const MIN_PASSWORD_LENGTH = 8;

const password = ref('');
const showPassword = ref(false);
const showErrors = ref(false);

const passwordTooShort = computed(
  () => password.value.length < MIN_PASSWORD_LENGTH,
);
const passwordError = computed(
  () => showErrors.value && passwordTooShort.value,
);

const submit = async () => {
  if (loading) return;
  showErrors.value = true;
  if (passwordTooShort.value) {
    await nextTick();
    document.getElementById('new-password')?.focus();
    return;
  }
  emit('submit', password.value);
};
</script>

<template>
  <form class="auth-form" novalidate @submit.prevent="submit">
    <UiInput
      id="new-password"
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      :label="passwordLabel ?? t('auth.passwordReset.newPassword')"
      autocomplete="new-password"
      required
      :disabled="loading"
      :error="passwordError"
      :hint="t('auth.passwordReset.passwordHint', { min: MIN_PASSWORD_LENGTH })"
      :aria-describedby="errorId"
    >
      <template #icon><AuthIconLock /></template>
    </UiInput>

    <UiCheckbox
      v-model="showPassword"
      :label="t('auth.passwordReset.showPassword')"
      :disabled="loading"
    />

    <UiButton type="submit" size="lg" full-width :loading="loading">
      {{ loading ? t('auth.passwordReset.saving') : submitLabel }}
    </UiButton>
  </form>
</template>
