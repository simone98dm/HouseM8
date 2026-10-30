<script setup lang="ts">
const { t } = useI18n();

const links = [
  { to: '/privacy', labelKey: 'landing.footer.privacyPolicy' },
  { to: '/cookies', labelKey: 'landing.footer.cookiePolicy' },
  { to: '/terms', labelKey: 'landing.footer.termsOfService' },
] as const;
</script>

<template>
  <nav
    :aria-label="t('landing.footer.a11y.legalLinks')"
    class="legal-links"
    data-testid="legal-links"
  >
    <ul
      class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm"
      role="list"
    >
      <li v-for="link in links" :key="link.to">
        <NuxtLink
          :to="link.to"
          class="inline-flex min-h-6 items-center text-fg-muted underline-offset-2 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >{{ t(link.labelKey) }}</NuxtLink
        >
      </li>
    </ul>
  </nav>
</template>
