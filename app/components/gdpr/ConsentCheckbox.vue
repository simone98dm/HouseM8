<script setup lang="ts">
import { MIN_SIGNUP_AGE } from '~~/shared/utils/legal';

interface ConsentCheckboxProps {
  idPrefix?: string;
  /** Show unticked boxes as invalid (set by the parent after a failed submit). */
  showErrors?: boolean;
  /** Id of the parent's error message, referenced by invalid boxes. */
  errorId?: string;
}

interface ConsentState {
  age_confirmed: boolean;
  terms_accepted: boolean;
  privacy_acknowledged: boolean;
}

const {
  idPrefix = 'consent',
  showErrors = false,
  errorId = undefined,
} = defineProps<ConsentCheckboxProps>();
const model = defineModel<ConsentState>({ required: true });

function update(key: keyof ConsentState, event: Event) {
  model.value = {
    ...model.value,
    [key]: (event.target as HTMLInputElement).checked,
  };
}

const KEYS = {
  age_confirmed: 'age',
  terms_accepted: 'terms',
  privacy_acknowledged: 'privacy',
} as const;

const isInvalid = (key: keyof ConsentState) =>
  showErrors && !model.value[key] ? ('true' as const) : undefined;

const describedBy = (key: keyof ConsentState) =>
  isInvalid(key) ? errorId : undefined;

// Moves focus to the first unticked box (called by the parent on a failed submit).
function focusFirstInvalid() {
  const key = (Object.keys(KEYS) as (keyof ConsentState)[]).find(
    (k) => !model.value[k],
  );
  if (key) document.getElementById(`${idPrefix}-${KEYS[key]}`)?.focus();
}

defineExpose({ focusFirstInvalid });

const linkClass =
  'font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-sm';
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 text-sm font-semibold text-fg">
      {{ $t('gdpr.consent.legend') }}
    </legend>

    <!-- Unticked by default, equal weight, one per purpose. -->
    <UiCheckbox
      :id="`${idPrefix}-age`"
      :model-value="model.age_confirmed"
      :label="$t('gdpr.consent.age', { age: MIN_SIGNUP_AGE })"
      aria-required="true"
      :aria-invalid="isInvalid('age_confirmed')"
      :aria-describedby="describedBy('age_confirmed')"
      @change="update('age_confirmed', $event)"
    />

    <UiCheckbox
      :id="`${idPrefix}-terms`"
      :model-value="model.terms_accepted"
      aria-required="true"
      :aria-invalid="isInvalid('terms_accepted')"
      :aria-describedby="describedBy('terms_accepted')"
      @change="update('terms_accepted', $event)"
    >
      <i18n-t keypath="gdpr.consent.terms" tag="span">
        <template #link>
          <NuxtLink to="/terms" target="_blank" :class="linkClass"
            >{{ $t('gdpr.consent.termsLinkText')
            }}<span class="sr-only">
              ({{ $t('common.opensInNewTab') }})</span
            ></NuxtLink
          >
        </template>
      </i18n-t>
    </UiCheckbox>

    <UiCheckbox
      :id="`${idPrefix}-privacy`"
      :model-value="model.privacy_acknowledged"
      aria-required="true"
      :aria-invalid="isInvalid('privacy_acknowledged')"
      :aria-describedby="describedBy('privacy_acknowledged')"
      @change="update('privacy_acknowledged', $event)"
    >
      <i18n-t keypath="gdpr.consent.privacy" tag="span">
        <template #link>
          <NuxtLink to="/privacy" target="_blank" :class="linkClass"
            >{{ $t('gdpr.consent.privacyLinkText')
            }}<span class="sr-only">
              ({{ $t('common.opensInNewTab') }})</span
            ></NuxtLink
          >
        </template>
      </i18n-t>
      <template #hint>{{ $t('gdpr.consent.privacyHint') }}</template>
    </UiCheckbox>
  </fieldset>
</template>
