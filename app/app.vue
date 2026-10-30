<template>
  <div id="app">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Driven by useLoading(), which only ever flips during client-side
         requests. The server renders nothing here and the client can render the
         overlay, so it hydration-mismatched on the Transition's root node. -->
    <ClientOnly>
      <AppLoader />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();
const config = useRuntimeConfig();

// <html lang> was absent entirely — WCAG 3.1.1 (Language of Page, Level A).
// It matters more since the landing surface became bilingual: without it a
// screen reader announces Italian copy with an English voice. Bound to the
// active locale so it follows a language switch.
useHead({
  htmlAttrs: { lang: computed(() => locale.value) },
});

useSeoMeta({
  titleTemplate: '%s | House M8',
  description: t('seo.description'),
  ogSiteName: 'House M8',
  ogType: 'website',
  ogImage: `${config.public.baseUrl}/og-image.svg`,
  ogDescription: t('seo.description'),
  twitterCard: 'summary_large_image',
});

// Store initialization is owned solely by app/plugins/stores.client.ts, which
// already initializes on boot and re-initializes on auth change (and resets on
// logout). This file used to run a second, near-identical initializer via
// useInitializeStores(), which additionally passed forceRefresh: true —
// deliberately bypassing each store's cache guard and guaranteeing a duplicate
// request even when the plugin had just loaded the same data. It also called
// userStore.initialize() -> fetchCurrentUser() for a user the watcher had
// already observed, which auth.global.ts had itself already fetched.
</script>
