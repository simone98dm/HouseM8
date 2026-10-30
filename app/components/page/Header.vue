<script setup lang="ts">
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

const userStore = useUserStore();
const { isEnabled } = useFeatureFlags();
const isStripeEnabled = isEnabled('showStripe');

const headerLinks = computed(() => {
  const links = [
    { label: t('landing.nav.features'), href: '/#features' },
    { label: t('landing.nav.howItWorks'), href: '/#how-it-works' },
    { label: t('landing.nav.pricing'), href: '/#pricing' },
  ];
  return isStripeEnabled ? links : links.filter((l) => l.href !== '/#pricing');
});

const currentUserId = computed(() => userStore.currentUser?.id);
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-line bg-surface">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-control focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {{ t('common.skipToContent') }}
    </a>
    <div
      class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-3 text-fg hover:no-underline"
      >
        <span
          class="flex size-10 items-center justify-center rounded-control bg-brand text-brand-on"
        >
          <Icon
            name="heroicons:home-modern"
            class="size-5"
            aria-hidden="true"
          />
        </span>
        <span class="max-[359px]:sr-only">
          <span class="block text-lg font-bold leading-tight">House M8</span>
          <span class="hidden text-xs text-fg-muted sm:block">
            {{ t('landing.nav.tagline') }}
          </span>
        </span>
      </NuxtLink>

      <nav
        class="hidden items-center gap-8 md:flex"
        :aria-label="t('landing.nav.sectionsLabel')"
      >
        <a
          v-for="link in headerLinks"
          :key="link.href"
          :href="link.href"
          class="text-sm font-semibold text-fg-muted transition-colors hover:text-fg hover:no-underline"
        >
          {{ link.label }}
        </a>
      </nav>

      <!-- :key is load-bearing — see the note in pages/index.vue. -->
      <div
        :key="`hdr-${hydrated}-${userStore.isAuthenticated}`"
        class="flex items-center gap-4"
      >
        <template v-if="userStore.isAuthenticated">
          <NuxtLink
            to="/dashboard"
            class="text-sm font-semibold text-fg transition-colors hover:text-brand"
          >
            {{ t('landing.nav.goToDashboard') }}
          </NuxtLink>
          <NuxtLink
            :to="currentUserId ? `/user/${currentUserId}` : '/dashboard'"
            class="flex size-10 items-center justify-center rounded-full bg-surface-hover text-fg-muted transition-colors hover:text-fg"
            :aria-label="t('landing.nav.profile')"
          >
            <Icon
              name="heroicons:user-circle"
              class="size-6"
              aria-hidden="true"
            />
          </NuxtLink>
        </template>
        <template v-else>
          <!-- Visible at every width: on a phone this is the only route to
               sign in from the landing page. -->
          <NuxtLink
            to="/auth/login"
            class="inline-flex min-h-10 items-center whitespace-nowrap text-sm font-semibold text-fg transition-colors hover:text-brand"
          >
            {{ t('landing.nav.logIn') }}
          </NuxtLink>
          <NuxtLink
            v-if="isEnabled('showSignup')"
            to="/auth/register"
            class="inline-flex min-h-10 items-center whitespace-nowrap rounded-control bg-brand px-4 text-sm font-semibold text-brand-on transition-colors hover:bg-brand-hover hover:no-underline"
          >
            {{ t('landing.nav.signUpFree') }}
          </NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>
