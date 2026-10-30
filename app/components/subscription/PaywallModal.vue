<script setup lang="ts">
interface Props {
  show: boolean;
  requiredPlan: 'pro' | 'house_plus';
}
interface Events {
  close: [];
}
const { show, requiredPlan } = defineProps<Props>();
const emit = defineEmits<Events>();

type PriceKey =
  'pro_annual' | 'pro_monthly' | 'house_plus_annual' | 'house_plus_monthly';

const subscriptionStore = useSubscriptionStore();
const { money } = usePriceFormat();
const isLoading = ref(false);
const hasWaiver = ref(false);
const waiverError = ref(false);
const waiverRef = ref<{ focus: () => void } | null>(null);
const waiverHintId = useId();

const planName = computed(() => (requiredPlan === 'pro' ? 'Pro' : 'House+'));
const annual = computed(
  () =>
    subscriptionStore.prices?.[
      requiredPlan === 'pro' ? 'pro_annual' : 'house_plus_annual'
    ],
);
const monthly = computed(
  () =>
    subscriptionStore.prices?.[
      requiredPlan === 'pro' ? 'pro_monthly' : 'house_plus_monthly'
    ],
);
const canShowPrices = computed(
  () => !subscriptionStore.isPricesLoading && !subscriptionStore.hasPricesError,
);

// Prices are loaded once and shared with the pricing page via the store.
watch(hasWaiver, (ticked) => {
  if (ticked) waiverError.value = false;
});

watch(
  () => show,
  (isOpen) => {
    if (isOpen && !subscriptionStore.prices) subscriptionStore.loadPrices();
  },
  { immediate: true },
);

async function upgrade(priceKey: PriceKey) {
  if (!hasWaiver.value) {
    waiverError.value = true;
    waiverRef.value?.focus();
    return;
  }
  isLoading.value = true;
  try {
    const url = await subscriptionStore.createCheckoutSession(priceKey, true);
    if (url) window.location.href = url;
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <UiModal
    :show="show"
    :title="$t('subscription.upgradeTitle')"
    @close="emit('close')"
  >
    <div class="space-y-4 p-6 text-center">
      <p class="text-sm text-fg-muted">
        {{ $t('subscription.upgradeDescription') }}
      </p>

      <SubscriptionWaiverBlock
        ref="waiverRef"
        v-model="hasWaiver"
        :hint-id="waiverHintId"
        :has-error="waiverError"
      />

      <SubscriptionAlreadySubscribedNotice />

      <div
        v-if="subscriptionStore.hasPricesError"
        role="alert"
        class="state-card state-card--error flex-wrap items-center justify-between text-left text-sm"
      >
        <p>{{ $t('pricing.pricesError') }}</p>
        <UiButton
          size="sm"
          variant="secondary"
          @click="subscriptionStore.loadPrices()"
        >
          {{ $t('common.retry') }}
        </UiButton>
      </div>

      <UiCard
        v-else
        tone="brand"
        padding="sm"
        :aria-busy="subscriptionStore.isPricesLoading"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-left">
            <p class="font-bold text-fg">
              {{ planName }} — {{ $t('subscription.annual') }}
            </p>
            <SubscriptionPricingAmount
              v-if="canShowPrices && annual"
              :monthly="money(annual.display_amount / 12, annual.currency)"
              :yearly="money(annual.display_amount, annual.currency)"
            />
            <div
              v-else-if="subscriptionStore.isPricesLoading"
              role="status"
              class="h-14 w-40 rounded-control bg-surface-hover"
            >
              <span class="sr-only">{{ $t('common.loading') }}</span>
            </div>
          </div>
          <UiButton
            :loading="isLoading"
            :disabled="!canShowPrices || !annual || isLoading"
            :aria-describedby="waiverHintId"
            @click="
              upgrade(
                requiredPlan === 'pro' ? 'pro_annual' : 'house_plus_annual',
              )
            "
          >
            {{ $t('subscription.startAnnual') }}
          </UiButton>
        </div>
      </UiCard>

      <!-- Raw: a plain underlined text link, not a padded button — same
           quiet-secondary-action pattern kept raw elsewhere in the app. -->
      <button
        v-if="canShowPrices && monthly"
        type="button"
        class="min-h-11 text-sm text-fg-muted underline underline-offset-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        :aria-describedby="waiverHintId"
        @click="
          upgrade(requiredPlan === 'pro' ? 'pro_monthly' : 'house_plus_monthly')
        "
      >
        {{
          $t('pricing.orMonthlyAt', {
            amount: money(monthly.display_amount, monthly.currency),
          })
        }}
      </button>
    </div>
  </UiModal>
</template>
