<script setup lang="ts">
// Signed-in users get the app shell (default layout); visitors get the public
// marketing chrome instead of an empty app rail. The session only exists on the
// client, so the server infers it from the (httpOnly) auth cookies; otherwise a
// signed-in visitor would hydrate a public layout into the app shell.
definePageMeta({
  middleware: [
    'stripe',
    () => {
      const isSignedIn = import.meta.server
        ? hasAuthCookie()
        : useUserStore().isAuthenticated;
      if (!isSignedIn) setPageLayout('public');
    },
  ],
});

const subscriptionStore = useSubscriptionStore();
const userStore = useUserStore();
const { t } = useI18n();
const config = useRuntimeConfig();

useSeoMeta({
  title: () => t('seo.titles.pricing'),
  ogTitle: () => `${t('seo.titles.pricing')} | House M8`,
  description: () => t('seo.descriptions.pricing'),
  ogDescription: () => t('seo.descriptions.pricing'),
  ogUrl: `${config.public.baseUrl}/pricing`,
  robots: 'index, follow',
});

const isLoading = ref<string | null>(null);
const hasWaiver = ref(false);
const waiverError = ref(false);
const waiverHintId = useId();
const waiverRef = ref<{ focus: () => void } | null>(null);

onMounted(() => subscriptionStore.loadPrices());

const { money } = usePriceFormat();

// Plan the signed-in user is actually on (anonymous visitors have none).
const currentPlan = computed(() =>
  userStore.isAuthenticated ? subscriptionStore.plan : null,
);

interface Feature {
  key: string;
  included: boolean;
}
const features = (group: string, count: number, limits = 0): Feature[] => [
  ...Array.from({ length: count }, (_, i) => ({
    key: `pricing.${group}.feature${i + 1}`,
    included: true,
  })),
  ...Array.from({ length: limits }, (_, i) => ({
    key: `pricing.${group}.limitation${i + 1}`,
    included: false,
  })),
];
const freeFeatures = features('free', 3, 2);
const proFeatures = features('pro', 5);
const housePlusFeatures = features('housePlus', 4);

type PriceKey =
  'pro_monthly' | 'pro_annual' | 'house_plus_monthly' | 'house_plus_annual';

function priceOf(key: PriceKey) {
  return subscriptionStore.prices?.[key];
}

function yearlyTotal(key: PriceKey): string | null {
  const price = priceOf(key);
  return price ? money(price.display_amount, price.currency) : null;
}

function perMonth(key: PriceKey): string | null {
  const price = priceOf(key);
  return price ? money(price.display_amount / 12, price.currency) : null;
}

const canShowPrices = computed(
  () => !subscriptionStore.isPricesLoading && !subscriptionStore.hasPricesError,
);

// The page is public, so a visitor can reach a paid CTA without an account.
// Checkout requires a session; send them to register first rather than firing a
// request that can only 401.
async function subscribe(priceKey: PriceKey) {
  if (!userStore.isAuthenticated) {
    return navigateTo({
      path: '/auth/register',
      query: { redirect: '/pricing' },
    });
  }
  if (!hasWaiver.value) {
    waiverError.value = true;
    waiverRef.value?.focus();
    return;
  }

  isLoading.value = priceKey;
  try {
    const url = await subscriptionStore.createCheckoutSession(priceKey, true);
    if (url) window.location.href = url;
  } finally {
    isLoading.value = null;
  }
}

watch(hasWaiver, (ticked) => {
  if (ticked) waiverError.value = false;
});
</script>

<template>
  <AppPageHeader
    v-if="userStore.isAuthenticated"
    :title="$t('pricing.title')"
    :meta="$t('pricing.subtitle')"
  />
  <UiContainer>
    <div v-if="!userStore.isAuthenticated" class="mb-2">
      <h1 class="text-2xl font-semibold text-fg">{{ $t('pricing.title') }}</h1>
      <p class="mt-1 text-fg-muted">{{ $t('pricing.subtitle') }}</p>
    </div>

    <SubscriptionWaiverBlock
      ref="waiverRef"
      v-model="hasWaiver"
      class="mt-8"
      :hint-id="waiverHintId"
      :has-error="waiverError"
    />

    <SubscriptionAlreadySubscribedNotice class="mt-4" />

    <div
      v-if="subscriptionStore.hasPricesError"
      role="alert"
      class="state-card state-card--error mt-6 flex-wrap items-center justify-between text-sm"
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

    <div
      class="mt-6 grid gap-6 md:grid-cols-3"
      :aria-busy="subscriptionStore.isPricesLoading"
    >
      <UiCard padding="lg">
        <p
          v-if="currentPlan === 'free'"
          class="mb-2 inline-block rounded-full bg-surface-hover px-3 py-0.5 text-xs font-semibold text-fg"
        >
          {{ $t('pricing.currentPlan') }}
        </p>
        <h2 class="text-lg font-bold text-fg">
          {{ $t('pricing.free.name') }}
        </h2>
        <p class="mt-1 text-3xl font-bold text-fg text-numeric">
          {{ money(0, 'EUR') }}
        </p>
        <ul class="mt-4 space-y-2 text-sm text-fg-muted">
          <li
            v-for="f in freeFeatures"
            :key="f.key"
            :class="{ 'text-fg-subtle': !f.included }"
          >
            <span aria-hidden="true">{{ f.included ? '✓' : '✗' }}</span>
            <span class="sr-only"
              >{{
                f.included ? $t('pricing.included') : $t('pricing.notIncluded')
              }}: </span
            >{{ $t(f.key) }}
          </li>
        </ul>
        <UiLinkButton
          variant="secondary"
          class="mt-6 w-full"
          :to="userStore.isAuthenticated ? '/dashboard' : '/auth/register'"
        >
          {{
            userStore.isAuthenticated
              ? $t('pricing.goToDashboard')
              : $t('auth.signUp.button')
          }}
        </UiLinkButton>
      </UiCard>

      <UiCard padding="lg" tone="brand">
        <p
          v-if="currentPlan === 'pro'"
          class="mb-2 inline-block rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-on"
        >
          {{ $t('pricing.currentPlan') }}
        </p>
        <p
          v-else
          class="mb-2 inline-block rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-on"
        >
          {{ $t('pricing.recommended') }}
        </p>
        <h2 class="text-lg font-bold text-fg">Pro</h2>
        <div class="mt-1">
          <SubscriptionPricingAmount
            v-if="canShowPrices && perMonth('pro_annual')"
            :monthly="perMonth('pro_annual')!"
            :yearly="yearlyTotal('pro_annual')!"
          />
          <div
            v-else-if="subscriptionStore.isPricesLoading"
            role="status"
            class="h-14 rounded-control bg-surface-hover"
          >
            <span class="sr-only">{{ $t('common.loading') }}</span>
          </div>
        </div>
        <ul class="mt-4 space-y-2 text-sm text-fg">
          <li
            v-for="f in proFeatures"
            :key="f.key"
            :class="{ 'text-fg-subtle': !f.included }"
          >
            <span aria-hidden="true">{{ f.included ? '✓' : '✗' }}</span>
            <span class="sr-only"
              >{{
                f.included ? $t('pricing.included') : $t('pricing.notIncluded')
              }}: </span
            >{{ $t(f.key) }}
          </li>
        </ul>
        <UiButton
          class="mt-6 w-full"
          :loading="isLoading === 'pro_annual'"
          :disabled="
            !canShowPrices || !priceOf('pro_annual') || isLoading !== null
          "
          :aria-describedby="waiverHintId"
          @click="subscribe('pro_annual')"
        >
          {{ $t('pricing.startPro') }}
        </UiButton>
        <!-- Raw: a plain underlined text link, same quiet-secondary-action
             pattern kept raw elsewhere (e.g. subscription/PaywallModal.vue). -->
        <button
          v-if="canShowPrices && priceOf('pro_monthly')"
          type="button"
          class="mt-2 min-h-11 w-full text-sm text-fg-muted underline underline-offset-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isLoading !== null"
          :aria-describedby="waiverHintId"
          @click="subscribe('pro_monthly')"
        >
          {{
            $t('pricing.orMonthlyAt', {
              amount: money(
                priceOf('pro_monthly')!.display_amount,
                priceOf('pro_monthly')!.currency,
              ),
            })
          }}
        </button>
      </UiCard>

      <UiCard padding="lg">
        <p
          v-if="currentPlan === 'house_plus'"
          class="mb-2 inline-block rounded-full bg-surface-hover px-3 py-0.5 text-xs font-semibold text-fg"
        >
          {{ $t('pricing.currentPlan') }}
        </p>
        <h2 class="text-lg font-bold text-fg">House+</h2>
        <div class="mt-1">
          <SubscriptionPricingAmount
            v-if="canShowPrices && perMonth('house_plus_annual')"
            :monthly="perMonth('house_plus_annual')!"
            :yearly="yearlyTotal('house_plus_annual')!"
          />
          <div
            v-else-if="subscriptionStore.isPricesLoading"
            role="status"
            class="h-14 rounded-control bg-surface-hover"
          >
            <span class="sr-only">{{ $t('common.loading') }}</span>
          </div>
        </div>
        <ul class="mt-4 space-y-2 text-sm text-fg-muted">
          <li
            v-for="f in housePlusFeatures"
            :key="f.key"
            :class="{ 'text-fg-subtle': !f.included }"
          >
            <span aria-hidden="true">{{ f.included ? '✓' : '✗' }}</span>
            <span class="sr-only"
              >{{
                f.included ? $t('pricing.included') : $t('pricing.notIncluded')
              }}: </span
            >{{ $t(f.key) }}
          </li>
        </ul>
        <UiButton
          variant="secondary"
          class="mt-6 w-full"
          :loading="isLoading === 'house_plus_annual'"
          :disabled="
            !canShowPrices ||
            !priceOf('house_plus_annual') ||
            isLoading !== null
          "
          :aria-describedby="waiverHintId"
          @click="subscribe('house_plus_annual')"
        >
          {{ $t('pricing.startHousePlus') }}
        </UiButton>
      </UiCard>
    </div>
  </UiContainer>
</template>
