<script setup lang="ts">
const { t } = useI18n();
const { isEnabled } = useFeatureFlags();
const isStripeEnabled = isEnabled('showStripe');
</script>

<template>
  <footer
    class="border-t border-line bg-surface px-4 pb-8 pt-14 sm:px-6 lg:px-8"
  >
    <div class="mx-auto max-w-6xl">
      <div class="mb-12 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div class="sm:col-span-2 md:col-span-1">
          <p class="text-lg font-bold text-fg">House M8</p>
          <p class="mt-3 text-sm text-fg-muted">
            {{ t('landing.footer.tagline') }}
          </p>
        </div>

        <nav :aria-label="t('landing.footer.a11y.productLinks')">
          <h2 class="mb-4 text-sm font-semibold text-fg">
            {{ t('landing.footer.product') }}
          </h2>
          <ul class="space-y-3 text-sm" role="list">
            <li>
              <a
                href="/#features"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.features') }}</a
              >
            </li>
            <li>
              <a
                href="/#how-it-works"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.howItWorks') }}</a
              >
            </li>
            <li v-if="isStripeEnabled">
              <a
                href="/#pricing"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.pricing') }}</a
              >
            </li>
            <li>
              <a
                href="/#faq"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.faq') }}</a
              >
            </li>
          </ul>
        </nav>

        <nav :aria-label="t('landing.footer.a11y.legalLinks')">
          <h2 class="mb-4 text-sm font-semibold text-fg">
            {{ t('landing.footer.legal') }}
          </h2>
          <ul class="space-y-3 text-sm" role="list">
            <li>
              <NuxtLink
                to="/privacy"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.privacyPolicy') }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink
                to="/cookies"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.cookiePolicy') }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink
                to="/terms"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.termsOfService') }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink
                to="/accessibility"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                >{{ t('landing.footer.accessibility') }}</NuxtLink
              >
            </li>
          </ul>
        </nav>

        <nav :aria-label="t('landing.footer.a11y.connectLinks')">
          <h2 class="mb-4 text-sm font-semibold text-fg">
            {{ t('landing.footer.connect') }}
          </h2>
          <ul class="space-y-3 text-sm" role="list">
            <li>
              <a
                href="https://github.com/simone98dm/house-m8-fe"
                class="inline-flex min-h-6 items-center text-fg-muted transition-colors hover:text-fg"
                target="_blank"
                rel="noopener noreferrer"
                >{{ t('landing.footer.github') }}</a
              >
            </li>
          </ul>
        </nav>
      </div>

      <PageLegalImprint />

      <!-- From the @simone98dm/layer Nuxt layer (extends in nuxt.config.ts),
           not a missing local component. -->
      <AppFooter />
    </div>
  </footer>
</template>
