<script setup lang="ts">
const { t } = useI18n();
const subscriptionStore = useSubscriptionStore();
const { money } = usePriceFormat();

// Prices come from Stripe, VAT-inclusive (CLAUDE.md, consumer law): never a
// hard-coded figure. Shared with /pricing and the paywall via the store.
onMounted(() => {
  if (!subscriptionStore.prices) subscriptionStore.loadPrices();
});
const proMonthly = computed(() => subscriptionStore.prices?.pro_monthly);

// computed, not plain consts: t() must re-evaluate when the locale changes.
const freePlanFeatures = computed(() => [
  t('landing.pricing.free.features.house'),
  t('landing.pricing.free.features.splitting'),
  t('landing.pricing.free.features.balances'),
  t('landing.pricing.free.features.bulletin'),
  t('landing.pricing.free.features.history'),
]);

const proPlanFeatures = computed(() => [
  t('landing.pricing.pro.features.everythingFree'),
  t('landing.pricing.pro.features.houses'),
  t('landing.pricing.pro.features.fullHistory'),
  t('landing.pricing.pro.features.issues'),
  t('landing.pricing.pro.features.reminders'),
]);
</script>

<template>
  <section id="pricing" class="bg-bg px-4 py-24 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <div class="mx-auto mb-4 max-w-3xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {{ t('landing.pricing.title') }}
        </h2>
        <p class="mt-4 text-lg text-fg-muted">
          {{ t('landing.pricing.subtitle') }}
        </p>
      </div>

      <div
        class="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-2 md:items-stretch"
      >
        <UiCard as="article" padding="lg">
          <div class="flex h-full flex-col">
            <div class="mb-6">
              <span
                class="inline-block rounded-full border border-line bg-surface-hover px-3 py-1 text-xs font-semibold text-fg-muted"
              >
                {{ t('landing.pricing.free.badge') }}
              </span>
            </div>
            <div class="mb-8">
              <p class="text-numeric text-3xl font-bold text-fg">
                {{ money(0, 'EUR') }}
              </p>
              <p class="mt-1 text-sm text-fg-muted">
                {{ t('landing.pricing.free.period') }}
              </p>
            </div>
            <ul class="mb-10 flex-1 space-y-3 text-sm text-fg" role="list">
              <li
                v-for="feature in freePlanFeatures"
                :key="feature"
                class="flex items-center gap-3"
              >
                <Icon
                  name="heroicons:check-circle"
                  class="h-5 w-5 shrink-0 text-ok-fg"
                  aria-hidden="true"
                />
                {{ feature }}
              </li>
            </ul>
            <UiLinkButton
              to="/auth/register"
              variant="secondary"
              size="lg"
              full-width
            >
              {{ t('landing.pricing.free.cta') }}
            </UiLinkButton>
          </div>
        </UiCard>

        <UiCard as="article" padding="lg" tone="brand">
          <div class="flex h-full flex-col">
            <div class="mb-6">
              <span
                class="inline-block rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-on"
              >
                {{ t('landing.pricing.pro.badge') }}
              </span>
            </div>
            <div class="mb-8" :aria-busy="subscriptionStore.isPricesLoading">
              <template v-if="proMonthly">
                <p class="text-numeric text-3xl font-bold text-fg">
                  {{ money(proMonthly.display_amount, proMonthly.currency) }}
                </p>
                <p class="mt-1 text-sm text-fg-muted">
                  {{ t('landing.pricing.pro.period') }} ·
                  {{ t('pricing.vatIncluded') }}
                </p>
              </template>
              <div
                v-else-if="subscriptionStore.isPricesLoading"
                role="status"
                class="h-14 w-32 rounded-control bg-surface-hover"
              >
                <span class="sr-only">{{ t('common.loading') }}</span>
              </div>
              <NuxtLink
                v-else
                to="/pricing"
                class="rounded-control text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {{ t('landing.pricing.pro.seePrices') }}
              </NuxtLink>
            </div>
            <ul class="mb-10 flex-1 space-y-3 text-sm text-fg" role="list">
              <li
                v-for="feature in proPlanFeatures"
                :key="feature"
                class="flex items-center gap-3"
              >
                <Icon
                  name="heroicons:check-circle"
                  class="h-5 w-5 shrink-0 text-ok-fg"
                  aria-hidden="true"
                />
                {{ feature }}
              </li>
            </ul>
            <UiLinkButton
              to="/auth/register"
              variant="primary"
              size="lg"
              full-width
            >
              {{ t('landing.pricing.pro.cta') }}
            </UiLinkButton>
          </div>
        </UiCard>
      </div>
    </div>
  </section>
</template>
