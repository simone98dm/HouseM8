<script setup lang="ts">
import type { UpdateProfilePayload } from '~/types';

useSeoMeta({ robots: 'noindex, nofollow' });

useThemeColor();

const userStore = useUserStore();
const housesStore = useHousesStore();
const notificationStore = useNotificationStore();

const hasHouse = computed(
  () => !!(housesStore.currentHouse && housesStore.isMember),
);
const isHouseDataLoading = computed(() => housesStore.isLoading);
const currentHouseId = computed(() => housesStore.currentHouse?.id);
const activeNotifications = computed(
  () => notificationStore.activeNotifications,
);

const isFirstAccess = computed(
  () => userStore.currentUser?.is_first_access === true,
);

// Three-state onboarding gate. Membership data loads asynchronously after
// reload, so a boolean fed only by is_first_access briefly (or persistently,
// if membership never re-triggers the check) shows the join-by-invite-code
// step to an owner/member who already has a house.
// - loading   → show a loading state, never the join screen
// - hasHouse  → never show onboarding, regardless of is_first_access
// - otherwise → genuinely first-access and house-less, show the wizard
const showOnboardingLoading = computed(
  () => isFirstAccess.value && isHouseDataLoading.value,
);
const showAccountSetupWizard = computed(
  () => isFirstAccess.value && !isHouseDataLoading.value && !hasHouse.value,
);
const showAccountSetupModal = computed(
  () => showOnboardingLoading.value || showAccountSetupWizard.value,
);
const showAccountSetupWizardModal = ref(false);

watch(
  () => showAccountSetupModal.value,
  (val) => {
    showAccountSetupWizardModal.value = val;
  },
  { immediate: true },
);

// Page identity band (DESIGN.md §5b): one motif per top-level page, keyed by
// route so no page carries markup for it.
const route = useRoute();
const PAGE_BANDS: Record<string, string> = {
  dashboard: 'home',
  expenses: 'expenses',
  bills: 'bills',
  balance: 'balance',
  'house-id': 'house',
  reports: 'reports',
};
const pageBand = computed(() => PAGE_BANDS[String(route.name)] ?? null);

const consentVersion = computed(
  () => userStore.currentUser?.consent_version ?? null,
);

const handleProfileUpdate = async (payload: UpdateProfilePayload) => {
  await userStore.updateProfile(payload);
  showAccountSetupWizardModal.value = false;
};

async function handleConsentAccepted() {
  await userStore.fetchCurrentUser(true);
}
</script>

<template>
  <div class="app-layout">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-control focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {{ $t('common.skipToContent') }}
    </a>

    <!-- Auth state only exists on the client: auth.global.ts returns early on
         the server, so SSR always renders the signed-out tree while the client
         renders the signed-in one. Every nav link and the avatar therefore
         mismatched on hydration. ClientOnly makes that boundary explicit
         instead of letting Vue patch it up with warnings. -->
    <ClientOnly>
      <AppNavigation :has-house="hasHouse" :current-house-id="currentHouseId" />
    </ClientOnly>

    <div class="main-content">
      <div id="header-content" />
      <main
        id="main-content"
        tabindex="-1"
        class="relative flex-1 focus:outline-none"
      >
        <div
          v-if="pageBand"
          :class="['page-band', `page-band--${pageBand}`]"
          aria-hidden="true"
        />
        <div class="page-body relative z-[1]">
          <slot />
        </div>
      </main>

      <!-- Sibling of <main> inside the flex column: main grows, so the footer
           sits at the bottom of short pages and after the content on long
           ones. It never overlaps and never creates its own scroll area. -->
      <LegalLinks class="py-2" />
    </div>

    <ClientOnly>
      <UiModal
        :show="showAccountSetupWizardModal"
        :title="$t('accountSetup.titles.completeProfile')"
        @close="showAccountSetupWizardModal = false"
      >
        <div
          v-if="showOnboardingLoading"
          class="flex flex-col items-center gap-3 py-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <UiSkeleton :height="40" :width="40" rounded="rounded-full" />
          <p class="text-sm font-medium text-fg-muted">
            {{ $t('common.loading') }}
          </p>
        </div>
        <LazyUserAccountSetupWizard v-else @submit="handleProfileUpdate" />
      </UiModal>
    </ClientOnly>

    <ClientOnly>
      <UiNotificationContainer
        :notifications="activeNotifications"
        @dismiss="notificationStore.dismissNotification($event)"
        @pause="notificationStore.pauseDismissal($event)"
        @resume="notificationStore.resumeDismissal($event)"
      />
    </ClientOnly>

    <ClientOnly>
      <!-- Suppressed during first-access onboarding so it never stacks over the
           setup wizard; it re-evaluates once the wizard completes (is_first_access=false). -->
      <GdprConsentVersionModal
        v-if="userStore.isAuthenticated && !showAccountSetupModal"
        :user-consent-version="consentVersion"
        @accepted="handleConsentAccepted"
      />
    </ClientOnly>
  </div>
</template>
