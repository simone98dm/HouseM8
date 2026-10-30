<script setup lang="ts">
definePageMeta({
  layout: false,
});

const config = useRuntimeConfig();
const { t } = useI18n();

// SEO copy is translated too: an Italian visitor's share card and search
// snippet should not be English.
useSeoMeta({
  titleTemplate: null,
  title: () => t('landing.seo.title'),
  ogTitle: () => t('landing.seo.title'),
  description: () => t('landing.seo.description'),
  ogDescription: () => t('landing.seo.description'),
  ogUrl: config.public.baseUrl,
  robots: 'index, follow',
});

const userStore = useUserStore();
const { isEnabled } = useFeatureFlags();
const isStripeEnabled = isEnabled('showStripe');

const newUsersEnabled = isEnabled('showSignup');

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

const authPrimaryLink = computed(() => {
  if (userStore.isAuthenticated) return '/dashboard';
  return newUsersEnabled ? '/auth/register' : '/auth/login';
});
</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-surface text-fg">
    <PageHeader />
    <main id="main-content" tabindex="-1" class="focus:outline-none">
      <LandingHero
        :is-authenticated="userStore.isAuthenticated"
        :auth-primary-link="authPrimaryLink"
      />
      <LazyLandingFeatures />
      <LazyLandingHowItWorks />
      <LazyLandingPricing v-if="isStripeEnabled" />
      <LazyLandingFaq />

      <section
        id="cta"
        class="bg-brand px-4 py-20 text-brand-on sm:px-6 lg:px-8"
      >
        <div class="mx-auto max-w-3xl">
          <h2 class="text-balance text-3xl font-bold sm:text-4xl">
            {{ t('landing.cta.title') }}
          </h2>
          <p class="mt-4 max-w-prose text-lg">
            {{ t('landing.cta.subtitle') }}
          </p>
          <!-- :key is load-bearing — see the hydration note in <script>. -->
          <NuxtLink
            :key="`cta-${hydrated}-${userStore.isAuthenticated}`"
            :to="authPrimaryLink"
            class="mt-8 inline-flex min-h-12 items-center justify-center rounded-control bg-surface px-6 text-base font-semibold text-brand-hover transition-colors hover:bg-surface-hover hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-on"
          >
            {{
              userStore.isAuthenticated
                ? t('landing.cta.ctaAuthenticated')
                : t('landing.cta.ctaGuest')
            }}
          </NuxtLink>
        </div>
      </section>
    </main>
    <PageFooter />
  </div>
</template>
