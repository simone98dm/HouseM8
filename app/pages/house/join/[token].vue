<script setup lang="ts">
definePageMeta({
  layout: false,
});

const { t: $t } = useI18n();

useSeoMeta({
  title: $t('seo.titles.joinHouse'),
});
const route = useRoute();
const userStore = useUserStore();

const {
  house,
  loading,
  accepting,
  error,
  success,
  userInHouse,
  isAuthenticated,
  handleAcceptInvitation,
} = useHouseJoinFlow();

// Public, token-scoped preview (house name + roommate count). Needed only for
// logged-out visitors; signed-in users get the full invitation instead.
const {
  data: preview,
  status: previewStatus,
  error: previewError,
} = await useFetch<{
  data: { house_name: string; member_count: number };
}>(`/api/invitation/${route.params.token}/preview`, {
  server: false,
  immediate: !isAuthenticated.value,
});

const isGuestLoading = computed(
  () =>
    !isAuthenticated.value &&
    (previewStatus.value === 'idle' || previewStatus.value === 'pending'),
);
const isGuestInvalid = computed(
  () => !isAuthenticated.value && !!previewError.value,
);
const isInvalid = computed(
  () => isGuestInvalid.value || (!!error.value && !house.value),
);

// Lets AuthShell say "Joining {house}" on sign-up / sign-in without the name
// ever travelling in a URL (a URL could be forged to show any text).
watch(
  () => preview.value?.data?.house_name,
  (name) => {
    if (!name) return;
    try {
      sessionStorage.setItem(JOIN_HOUSE_NAME_KEY, name);
    } catch {
      // storage blocked: the context line is simply omitted
    }
  },
  { immediate: true },
);
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
    <div class="w-full max-w-md">
      <div v-if="!isInvalid" class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center mb-4 size-14 rounded-card bg-brand text-brand-on"
        >
          <Icon
            name="heroicons:home-modern"
            class="size-7"
            aria-hidden="true"
          />
        </div>
        <h1 class="text-2xl font-semibold text-fg">
          {{ $t('invitation.title') }}
        </h1>
        <p class="mt-1 text-sm text-fg-muted">
          {{ $t('invitation.subtitle') }}
        </p>
      </div>

      <UiCard
        v-if="loading || isGuestLoading"
        padding="lg"
        role="status"
        :aria-label="$t('invitation.loading')"
      >
        <div class="space-y-6" aria-hidden="true">
          <div class="space-y-2 text-center">
            <div class="mx-auto h-4 w-32 rounded-control bg-surface-hover" />
            <div class="mx-auto h-7 w-48 rounded-control bg-surface-hover" />
            <div class="mx-auto h-4 w-40 rounded-control bg-surface-hover" />
          </div>
          <div class="h-11 rounded-control bg-surface-hover" />
          <div class="h-11 rounded-control bg-surface-hover" />
        </div>
        <span class="sr-only">{{ $t('invitation.loading') }}</span>
      </UiCard>

      <UiCard v-else-if="isInvalid" padding="lg" class="text-center">
        <div
          class="inline-flex items-center justify-center size-16 rounded-full bg-danger-subtle"
        >
          <Icon
            name="heroicons:exclamation-triangle"
            class="size-8 text-danger-fg"
            aria-hidden="true"
          />
        </div>
        <h1 class="text-xl font-semibold text-fg">
          {{ $t('invitation.invalidInvitation') }}
        </h1>
        <p class="text-sm text-fg-muted">
          {{ $t('invitation.invalidToken') }}
        </p>
        <div class="flex flex-col justify-center gap-3 sm:flex-row">
          <UiLinkButton to="/">
            {{ $t('invitation.goToHouseM8') }}
          </UiLinkButton>
          <UiLinkButton
            v-if="isAuthenticated"
            to="/dashboard"
            variant="secondary"
          >
            {{ $t('invitation.goToDashboard') }}
          </UiLinkButton>
        </div>
      </UiCard>

      <UiCard v-else-if="success" padding="lg" class="text-center">
        <div
          class="inline-flex items-center justify-center size-16 rounded-full bg-ok-subtle"
        >
          <Icon
            name="heroicons:check-circle"
            class="size-8 text-ok-fg"
            aria-hidden="true"
          />
        </div>
        <h2 class="text-xl font-semibold text-fg">
          {{ $t('invitation.accepted') }}
        </h2>
        <p class="text-sm text-fg-muted">
          {{ $t('invitation.welcomeMessage', { houseName: house?.name }) }}
        </p>
        <p class="text-xs text-fg-muted">
          {{ $t('invitation.redirecting') }}
        </p>
      </UiCard>

      <HouseJoinInvitationCard
        v-else-if="house || !isAuthenticated"
        :house="house"
        :preview="preview?.data"
        :error="error"
        :is-authenticated="isAuthenticated"
        :user-in-house="userInHouse"
        :accepting="accepting"
        :current-user-id="userStore.currentUser?.id"
        :full-path="route.fullPath"
        @accept="handleAcceptInvitation"
      />
    </div>
  </main>
</template>
