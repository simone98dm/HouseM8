<script setup lang="ts">
import type { UpdateProfilePayload, User } from '~/types';

interface Events {
  submit: [payload: UpdateProfilePayload];
}

const emit = defineEmits<Events>();

const { t } = useI18n();
const userStore = useUserStore();

// OAuth users already have first_name populated — skip Step 1 entirely
const isOAuthUser = computed(() => !!userStore.currentUser?.first_name);

// ── Step 1: name (skipped for OAuth users) ────────────────────────────────
const { firstName, lastName, step1Error, isStep1Valid, handleStep1 } =
  useAccountSetupNameStep();

// ── Step 2: invite code (optional) ─────────────────────────────────────────
const {
  inviteCode,
  codeError,
  codeLoading,
  isCodeComplete,
  joinedHouseId,
  handleRedeemCode,
} = useAccountSetupInviteCode();
const housesStore = useHousesStore();

// Live Blobatar preview: the avatar is drawn from the name as it is typed.
// Uploaded pictures are paused, so there is no picture step.
const previewUser = computed(
  () =>
    ({
      id: userStore.currentUser?.id ?? '',
      email: userStore.currentUser?.email ?? '',
      first_name: firstName.value,
      last_name: lastName.value,
    }) as User,
);

// ── Wizard steps ───────────────────────────────────────────────────────────
const steps = computed(() => {
  const base: string[] = [];
  if (!isOAuthUser.value) base.push(t('onboarding.wizard.step1.stepLabel'));
  base.push(t('onboarding.wizard.step2.stepLabel'));
  return base;
});

// Map wizard step index → logical step name
const getLogicalStep = (wizardStep: number) => {
  if (!isOAuthUser.value) {
    if (wizardStep === 0) return 'name';
    if (wizardStep === 1) return 'invite-code';
  } else if (wizardStep === 0) {
    return 'invite-code';
  }
  return 'unknown';
};

// ── Finish ──────────────────────────────────────────────────────────────────
// UiWizard emits finish with no payload — run all outstanding work here.
const onWizardFinish = async () => {
  // Step 1 only for email-only users (OAuth users already have their name)
  if (!isOAuthUser.value && firstName.value) {
    const ok = await handleStep1();
    if (!ok) return;
  }

  // Invite code redemption — non-blocking (user can still finish without a house)
  if (isCodeComplete.value) {
    await handleRedeemCode();
  }

  // Load the joined house before closing, so the app shows it straight away
  // instead of the house-less state. Done here, not on redeem: a house in the
  // store closes the wizard, and the name step is only saved above.
  if (joinedHouseId.value) {
    await housesStore.loadHouse(joinedHouseId.value);
  }

  emit('submit', { is_first_access: false });
};
</script>

<template>
  <UiWizard :steps="steps" @finish="onWizardFinish">
    <template #default="{ step }">
      <UiWizardStep
        v-if="getLogicalStep(step) === 'name'"
        :step-index="step"
        :is-valid="isStep1Valid"
      >
        <div class="wizard-step">
          <h2 class="wizard-step-title">
            {{ t('onboarding.wizard.step1.title') }}
          </h2>
          <p class="wizard-step-subtitle">
            {{ t('onboarding.wizard.step1.subtitle') }}
          </p>

          <div class="wizard-avatar-preview">
            <UiUserAvatar
              size="lg"
              live-name
              :user="previewUser"
              :aria-label="t('onboarding.wizard.step1.avatarPreview')"
            />
            <p class="wizard-avatar-hint">
              {{ t('onboarding.wizard.step1.avatarHint') }}
            </p>
          </div>

          <div class="wizard-step-fields">
            <UiInput
              id="wizard-first-name"
              v-model="firstName"
              :label="t('onboarding.wizard.step1.firstName')"
              :placeholder="t('onboarding.wizard.step1.firstNamePlaceholder')"
              type="text"
              autocomplete="given-name"
              required
            />
            <UiInput
              id="wizard-last-name"
              v-model="lastName"
              :label="t('onboarding.wizard.step1.lastName')"
              :placeholder="t('onboarding.wizard.step1.lastNamePlaceholder')"
              type="text"
              autocomplete="family-name"
              required
            />
          </div>

          <p v-if="step1Error" role="alert" class="wizard-error">
            {{ step1Error }}
          </p>
        </div>
      </UiWizardStep>

      <UiWizardStep
        v-if="getLogicalStep(step) === 'invite-code'"
        :step-index="step"
        :is-valid="true"
      >
        <div class="wizard-step">
          <h2 class="wizard-step-title">
            {{ t('onboarding.wizard.step2.title') }}
          </h2>
          <p class="wizard-step-subtitle">
            {{ t('onboarding.wizard.step2.subtitle') }}
          </p>

          <div class="wizard-otp-wrap">
            <UiOtpCodeInput
              v-model="inviteCode"
              :has-error="!!codeError"
              :group-label="t('onboarding.invite.srProgress')"
              :disabled="codeLoading"
              :aria-describedby="codeError ? 'otp-error' : undefined"
              @complete="handleRedeemCode"
            />
          </div>

          <p v-if="codeError" id="otp-error" role="alert" class="wizard-error">
            {{ codeError }}
          </p>

          <p class="wizard-skip-hint">
            {{ t('onboarding.wizard.step2.skipHint') }}
          </p>
        </div>
      </UiWizardStep>
    </template>
  </UiWizard>
</template>

<style scoped>
.wizard-avatar-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.wizard-avatar-hint {
  font-size: var(--fs-sm);
  color: var(--fg-muted);
}

.wizard-step {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 8px;
}

.wizard-step-title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--fg);
  margin-bottom: 6px;
}

.wizard-step-subtitle {
  font-size: var(--fs-sm);
  color: var(--fg-muted);
  margin-bottom: 20px;
  line-height: 1.55;
}

.wizard-step-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wizard-field-hint {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  margin-top: -6px;
}

.wizard-error {
  font-size: var(--fs-sm);
  color: var(--danger);
  margin-top: 10px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--danger) 8%, transparent);
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--danger) 20%, transparent);
}

.wizard-otp-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px;
}

.wizard-skip-hint {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  text-align: center;
  margin-top: 12px;
}
</style>
