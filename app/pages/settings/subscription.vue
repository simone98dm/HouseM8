<script setup lang="ts">
import type { WithdrawResult } from '~/composables/useSubscriptionApi';

definePageMeta({ middleware: 'stripe' });

const subscriptionStore = useSubscriptionStore();
const { t, locale } = useI18n();

useSeoMeta({ title: () => t('settings.subscription.title') });

onMounted(() => subscriptionStore.loadSubscription());

const isPortalLoading = ref(false);

async function openPortal() {
  isPortalLoading.value = true;
  const url = await subscriptionStore.openBillingPortal();
  if (url) window.location.href = url;
  isPortalLoading.value = false;
}

const showCancelDialog = ref(false);
const isWithdrawing = ref(false);
const outcome = ref<WithdrawResult | null>(null);
const outcomeHeading = ref<HTMLElement | null>(null);

// The withdraw button (and the dialog's return-focus target) is replaced by the
// outcome panel: focus its heading so the result is read and focus is not lost.
watch(outcome, (val) => {
  if (val) setTimeout(() => outcomeHeading.value?.focus(), 0);
});

async function confirmWithdraw() {
  isWithdrawing.value = true;
  try {
    const result = await subscriptionStore.withdraw();
    if (result) {
      outcome.value = result;
      showCancelDialog.value = false;
    }
  } finally {
    isWithdrawing.value = false;
  }
}

const outcomeMessage = computed(() => {
  if (!outcome.value) return '';
  const { mode, access_ends_at: endsAt } = outcome.value;
  if (!endsAt) return t('settings.subscription.cancel.doneNoDate');
  const date = new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'long',
  }).format(new Date(endsAt));
  return t(
    mode === 'immediate'
      ? 'settings.subscription.cancel.doneImmediate'
      : 'settings.subscription.cancel.donePeriodEnd',
    { date },
  );
});

const planLabel = computed(() => {
  const labels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    house_plus: 'House+',
  };
  return labels[subscriptionStore.plan] ?? 'Free';
});
</script>

<template>
  <AppPageHeader :title="$t('settings.subscription.title')" />
  <UiContainer>
    <UiCard padding="lg">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-fg-muted">
            {{ $t('settings.subscription.currentPlan') }}
          </p>
          <p class="text-2xl font-bold text-fg">
            {{ planLabel }}
          </p>
          <p
            v-if="subscriptionStore.isTrialing"
            class="mt-1 text-sm text-brand-hover"
          >
            {{ $t('settings.subscription.trialing') }}
          </p>
        </div>
        <div class="flex gap-3">
          <UiButton
            v-if="subscriptionStore.isPro"
            :loading="isPortalLoading"
            variant="secondary"
            @click="openPortal"
          >
            {{ $t('settings.subscription.manageBilling') }}
          </UiButton>
          <UiLinkButton v-if="!subscriptionStore.isPro" to="/pricing">
            {{ $t('settings.subscription.upgrade') }}
          </UiLinkButton>
        </div>
      </div>
    </UiCard>

    <UiCard v-if="outcome" as="section" role="status" class="mt-6">
      <h2
        ref="outcomeHeading"
        tabindex="-1"
        class="text-base font-semibold text-fg"
      >
        {{ $t('settings.subscription.cancel.doneTitle') }}
      </h2>
      <p class="mt-1 text-sm text-fg-muted">{{ outcomeMessage }}</p>
      <p class="mt-1 text-sm text-fg-muted">
        {{ $t('settings.subscription.cancel.email') }}
      </p>
    </UiCard>

    <div v-else-if="subscriptionStore.canWithdraw" class="mt-6">
      <UiButton variant="danger" @click="showCancelDialog = true">
        {{ $t('settings.subscription.cancel.button') }}
      </UiButton>
    </div>

    <UiModal
      :show="showCancelDialog"
      :title="$t('settings.subscription.cancel.title')"
      max-width="max-w-md"
      @close="!isWithdrawing && (showCancelDialog = false)"
    >
      <p class="text-sm text-fg">
        {{ $t('settings.subscription.cancel.intro') }}
      </p>
      <ul class="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
        <li>{{ $t('settings.subscription.cancel.immediate') }}</li>
        <li>{{ $t('settings.subscription.cancel.periodEnd') }}</li>
        <li>{{ $t('settings.subscription.cancel.email') }}</li>
      </ul>
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <UiButton
          variant="secondary"
          :disabled="isWithdrawing"
          @click="showCancelDialog = false"
        >
          {{ $t('settings.subscription.cancel.keep') }}
        </UiButton>
        <UiButton
          variant="danger"
          :loading="isWithdrawing"
          @click="confirmWithdraw"
        >
          {{ $t('settings.subscription.cancel.confirm') }}
        </UiButton>
      </div>
    </UiModal>
  </UiContainer>
</template>
