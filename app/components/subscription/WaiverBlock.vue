<script setup lang="ts">
/**
 * Pre-purchase consumer terms + required withdrawal-waiver checkbox, shared by
 * the pricing page and the paywall modal. CTAs stay enabled; on submit without
 * the waiver the parent sets `hasError` and calls `focus()` (exposed here).
 */
interface WaiverBlockProps {
  hintId: string;
  hasError?: boolean;
}

const { hintId, hasError = false } = defineProps<WaiverBlockProps>();
const accepted = defineModel<boolean>({ required: true });
const id = useId();
const checkboxRef = ref<{ focus: () => void } | null>(null);

defineExpose({ focus: () => checkboxRef.value?.focus() });
</script>

<template>
  <UiCard as="section" class="text-left" :aria-labelledby="`${id}-heading`">
    <h2 :id="`${id}-heading`" class="text-base font-bold text-fg">
      {{ $t('pricing.terms.heading') }}
    </h2>
    <ul class="mt-3 space-y-1.5 text-sm text-fg-muted">
      <li>{{ $t('pricing.terms.vat') }}</li>
      <li>{{ $t('pricing.terms.trial') }}</li>
      <li>{{ $t('pricing.terms.renewal') }}</li>
      <li>{{ $t('pricing.terms.cancel') }}</li>
      <li>{{ $t('pricing.terms.adults') }}</li>
    </ul>
    <UiCheckbox
      :id="id"
      ref="checkboxRef"
      v-model="accepted"
      class="mt-4"
      :label="$t('pricing.waiver.label')"
      aria-required="true"
      :aria-describedby="hasError ? `${hintId} ${id}-error` : hintId"
      :aria-invalid="hasError ? 'true' : undefined"
    />
    <p :id="hintId" class="mt-2 text-sm text-fg-muted">
      {{ $t('pricing.waiver.hint') }}
      <NuxtLink to="/terms" class="font-medium text-brand underline">{{
        $t('pricing.waiver.termsLink')
      }}</NuxtLink>
    </p>
    <p
      v-if="hasError"
      :id="`${id}-error`"
      role="alert"
      class="mt-2 text-sm font-medium text-danger-fg"
    >
      {{ $t('pricing.waiver.error') }}
    </p>
  </UiCard>
</template>
