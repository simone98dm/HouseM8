<script setup lang="ts">
interface Props {
  isAuthenticated: boolean;
  authPrimaryLink: string;
}

defineProps<Props>();

const { t } = useI18n();

// Auth state is unknown during SSR, so the server emits the guest href. Vue
// accepts that attribute during hydration and never re-patches it, because
// nothing reactive changes afterwards — the store is already resolved by the
// first client render. Result: a signed-in visitor saw "Go to Dashboard" on a
// link pointing at /auth/login. Flipping this flag in onMounted forces exactly
// one post-hydration re-render, which rewrites the href. Do not remove.
const hydrated = ref(false);
onMounted(() => {
  hydrated.value = true;
});
</script>

<template>
  <section class="px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
    <div
      class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center"
    >
      <div>
        <h1
          class="text-balance text-4xl font-extrabold text-fg sm:text-5xl lg:text-6xl"
        >
          {{ t('landing.hero.headline') }}
          <span class="text-brand">{{ t('landing.hero.headlineAccent') }}</span>
        </h1>

        <p class="mt-6 max-w-xl text-lg text-fg-muted">
          {{ t('landing.hero.subtitle') }}
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <!-- :key forces the href to re-render once auth state is known
               (see the hydration note above). -->
          <UiLinkButton
            :key="`hero-cta-${hydrated}-${isAuthenticated}`"
            :to="authPrimaryLink"
            size="lg"
          >
            {{
              isAuthenticated
                ? t('landing.hero.ctaAuthenticated')
                : t('landing.hero.ctaGuest')
            }}
            <Icon
              name="heroicons:arrow-right"
              class="size-4"
              aria-hidden="true"
            />
          </UiLinkButton>
          <UiLinkButton to="#features" variant="secondary" size="lg">
            {{ t('landing.hero.ctaSecondary') }}
          </UiLinkButton>
        </div>
      </div>

      <!-- Illustrative ledger, not live data: hidden from assistive tech so
           it is not read out as page content. -->
      <div
        class="rounded-card border border-line bg-surface shadow-lg"
        aria-hidden="true"
      >
        <p
          class="border-b border-line px-5 py-3 text-sm font-medium text-fg-muted"
        >
          {{ t('landing.hero.ledger.label') }}
        </p>

        <div class="flex items-center gap-3 px-5 py-4">
          <span class="avatar avatar-b">M</span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-fg">
              {{ t('landing.hero.ledger.owe') }}
            </p>
            <p class="text-sm text-fg-muted">
              {{ t('landing.hero.ledger.oweDue') }}
            </p>
          </div>
          <span
            class="rounded-control bg-brand px-3 py-2 text-sm font-semibold text-brand-on"
          >
            {{ t('landing.hero.ledger.settle') }}
          </span>
        </div>

        <div class="flex items-center gap-3 border-t border-line px-5 py-4">
          <span class="avatar avatar-c">S</span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-fg">
              {{ t('landing.hero.ledger.owed') }}
            </p>
            <p class="text-sm text-fg-muted">
              {{ t('landing.hero.ledger.owedNote') }}
            </p>
          </div>
        </div>

        <div
          class="flex items-center gap-3 rounded-b-card border-t border-line bg-surface-hover px-5 py-4"
        >
          <Icon name="heroicons:bolt" class="size-5 shrink-0 text-fg-muted" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-fg">
              {{ t('landing.hero.ledger.bill') }}
            </p>
            <p class="text-sm text-fg-muted">
              {{ t('landing.hero.ledger.billDue') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
