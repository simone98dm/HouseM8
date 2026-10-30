<script setup lang="ts">
import { logger } from '~/utils/logger';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

interface ConsentVersionModalProps {
  userConsentVersion?: number | null;
}

interface ConsentVersionModalEmits {
  accepted: [];
}

const { userConsentVersion = null } = defineProps<ConsentVersionModalProps>();
const emit = defineEmits<ConsentVersionModalEmits>();

const consentsStore = useConsentsStore();
const { signOut } = useAuth();

const show = computed(
  () => userConsentVersion == null || userConsentVersion < LEGAL_POLICY_VERSION,
);
// null = the user never accepted anything (e.g. new Google account).
const isFirstTime = computed(() => userConsentVersion == null);

const consent = ref({
  age_confirmed: false,
  terms_accepted: false,
  privacy_acknowledged: false,
});
const allAccepted = computed(() => Object.values(consent.value).every(Boolean));

const hasError = ref(false);
const showConsentErrors = ref(false);
const checkboxesRef = ref<{ focusFirstInvalid: () => void } | null>(null);
const isSigningOut = ref(false);
async function accept() {
  if (!allAccepted.value) {
    showConsentErrors.value = true;
    await nextTick();
    checkboxesRef.value?.focusFirstInvalid?.();
    return;
  }
  showConsentErrors.value = false;
  hasError.value = false;
  const ok = await consentsStore.acceptTerms();
  if (ok) emit('accepted');
  else hasError.value = true;
}

async function handleSignOut() {
  isSigningOut.value = true;
  try {
    await signOut();
  } catch (error) {
    logger.error('Sign out failed', error);
  } finally {
    isSigningOut.value = false;
  }
  await navigateTo('/auth/login');
}

// The app root is made inert (background unreachable for keyboard, pointer and
// AT) while open. UiModal owns the focus trap, scroll lock and focus restore;
// `persistent` means Escape and backdrop clicks cannot dismiss it.
let appRoot: HTMLElement | null = null;

function setInert(on: boolean) {
  if (on) {
    appRoot = document.getElementById('__nuxt');
    appRoot?.setAttribute('inert', '');
    return;
  }
  appRoot?.removeAttribute('inert');
  appRoot = null;
}

watch(show, setInert, { flush: 'post' });
onMounted(() => {
  if (show.value) setInert(true);
});
onBeforeUnmount(() => {
  if (appRoot) setInert(false);
});
</script>

<template>
  <!-- No title/header: the header slot would add a close button, and this
       dialog cannot be dismissed without accepting or signing out. -->
  <UiModal
    :show="show"
    as="form"
    persistent
    max-width="max-w-md"
    novalidate
    aria-labelledby="consent-modal-title"
    aria-describedby="consent-modal-description"
    @close="() => {}"
    @submit="accept"
  >
    <h2 id="consent-modal-title" class="text-lg font-semibold text-fg">
      {{
        isFirstTime
          ? $t('gdpr.consentModal.titleFirst')
          : $t('gdpr.consentModal.titleUpdated')
      }}
    </h2>
    <p
      id="consent-modal-description"
      class="mt-2 text-sm leading-relaxed text-fg-muted"
    >
      {{
        isFirstTime
          ? $t('gdpr.consentModal.descriptionFirst')
          : $t('gdpr.consentModal.descriptionUpdated', {
              version: LEGAL_POLICY_VERSION,
            })
      }}
    </p>

    <div class="mt-5">
      <GdprConsentCheckbox
        ref="checkboxesRef"
        v-model="consent"
        id-prefix="consent-modal"
        :show-errors="showConsentErrors"
        error-id="consent-modal-required"
      />

      <p
        v-if="showConsentErrors && !allAccepted"
        id="consent-modal-required"
        role="alert"
        class="mt-4 text-sm font-medium text-danger-fg"
      >
        {{ $t('gdpr.consent.required') }}
      </p>

      <p v-if="hasError" role="alert" class="mt-4 text-sm text-danger-fg">
        {{ $t('gdpr.consentModal.error') }}
      </p>
    </div>

    <template #footer>
      <div
        class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between"
      >
        <UiButton
          type="button"
          variant="ghost"
          :disabled="consentsStore.isLoading || isSigningOut"
          @click="handleSignOut"
        >
          {{ $t('gdpr.consentModal.signOut') }}
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="consentsStore.isLoading"
          :loading="consentsStore.isLoading"
        >
          {{ $t('gdpr.consentVersionAccept') }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
