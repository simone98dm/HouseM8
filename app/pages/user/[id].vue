<script lang="ts" setup>
import type { User, HouseMember } from '~/types';

const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.userProfile'),
});

const route = useRoute();
const { formatShort } = useDate();
const { signOut: authSignOut } = useAuth();
const housesStore = useHousesStore();
const expensesStore = useExpensesStore();
const userStore = useUserStore();
const userApi = useUserApi();
const notificationStore = useNotificationStore();

const currentHouse = computed(() => housesStore.currentHouse);
const houseMembers = computed(() => housesStore.activeMembers);
const currentUser = computed(() => userStore.currentUser);

// Track if initial data has loaded
const hasInitiallyLoaded = ref(false);

// Loading state — true until stores have loaded at least once
const isInitialLoading = computed(() => {
  if (!hasInitiallyLoaded.value) {
    if (!userStore.currentUser) return true;
    const housesNotFetched = housesStore.lastFetch === null;
    return housesNotFetched || housesStore.isLoading;
  }
  return false;
});

const loading = ref(true);
const profileUser = ref<User | null>(null);
const memberInfo = computed<HouseMember | null>(() => {
  if (!currentHouse.value || !profileUser.value) return null;
  return (
    houseMembers.value.find(
      (m) =>
        m.user_id === profileUser.value?.id ||
        m.user?.id === profileUser.value?.id,
    ) ?? null
  );
});
// Get user ID from route or use current user's ID if not provided
const userId = computed(
  () => (route.params.id as string) || currentUser.value?.id || '',
);

// Check if viewing own profile
const isOwnProfile = computed(() => {
  return (
    currentUser.value &&
    profileUser.value &&
    currentUser.value.id === profileUser.value.id
  );
});

const handleProfileUpdate = async (data: Partial<User>): Promise<boolean> => {
  try {
    await userStore.updateProfile(data);
  } catch {
    // The store notifies; the form stays open so nothing typed is lost.
    return false;
  }
  // No reload: the skeleton swap would unmount the form and drop focus.
  profileUser.value = userStore.currentUser;
  return true;
};

const loadUserProfile = async () => {
  if (!userId.value) {
    loading.value = false;
    return;
  }

  loading.value = true;

  try {
    if (userId.value === currentUser.value?.id) {
      profileUser.value = currentUser.value;
    } else if (currentHouse.value) {
      const user = await userApi.getUserById(userId.value);

      if (!user) {
        notificationStore.error(t('user.notFound'), t('user.notFoundDesc'));
        profileUser.value = null;
        loading.value = false;
        return;
      }

      profileUser.value = user;
    }
  } catch {
    notificationStore.error(
      t('user.failedToLoadTitle'),
      t('user.failedToLoadDesc'),
    );
  } finally {
    loading.value = false;
  }
};

const profileName = computed(() => {
  const user = profileUser.value;
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  return name || t('user.unknownUser');
});

const pageTitle = computed(() => {
  if (isOwnProfile.value) return t('profile.title');
  return profileUser.value ? profileName.value : t('user.title');
});

const backTo = computed(() =>
  currentHouse.value ? `/house/${currentHouse.value.id}` : '/dashboard',
);

const signOut = async () => {
  try {
    housesStore.reset();
    expensesStore.reset();
    await authSignOut();
    await navigateTo('/auth/login', { replace: true });
  } catch {
    await navigateTo('/auth/login', { replace: true });
  }
};

// Data load is driven by the watcher below (with immediate: true) — no onMounted needed.

watch(
  [
    () => housesStore.lastFetch,
    () => housesStore.isLoading,
    () => userStore.currentUser,
  ],
  ([lastFetch, isLoading, currentUser]) => {
    if (
      currentUser &&
      lastFetch !== null &&
      !isLoading &&
      !hasInitiallyLoaded.value
    ) {
      hasInitiallyLoaded.value = true;
      if (userId.value) {
        loadUserProfile();
      }
    }
  },
  { immediate: true },
);

watch(currentHouse, (newHouse) => {
  if (newHouse && userId.value && hasInitiallyLoaded.value) {
    loadUserProfile();
  }
});
</script>

<template>
  <AppPageHeader
    :allow-back="!isOwnProfile"
    :back-to="backTo"
    :title="pageTitle"
  />

  <UiContainer v-if="isInitialLoading || loading" role="status">
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <div aria-hidden="true">
      <div class="mb-6 flex items-center gap-4">
        <UiSkeleton class="size-16 shrink-0 rounded-full" />
        <div class="space-y-2">
          <UiSkeleton class="h-4 w-40" />
          <UiSkeleton class="h-3 w-52" />
        </div>
      </div>
      <UiCard>
        <UiSkeleton class="h-5 w-32" />
        <div class="mt-4 space-y-3">
          <UiSkeleton v-for="n in 4" :key="n" class="h-4 w-full max-w-sm" />
        </div>
      </UiCard>
    </div>
  </UiContainer>

  <template v-else>
    <UiCard v-if="!profileUser" class="text-center">
      <div
        class="inline-flex items-center justify-center size-12 rounded-full bg-surface-hover"
      >
        <Icon
          name="heroicons:user-circle"
          class="h-6 w-6 text-fg-subtle"
          aria-hidden="true"
        />
      </div>
      <h2 class="text-lg font-semibold text-fg">
        {{ $t('user.notFound') }}
      </h2>
      <p class="text-sm text-fg-muted">
        {{ $t('user.notFoundDesc') }}
      </p>
      <UiButton @click="$router.go(-1)">
        {{ $t('user.goBack') }}
      </UiButton>
    </UiCard>

    <UiContainer v-else-if="profileUser">
      <!-- Profile hero header — design-system: large avatar w-20 h-20 rounded-full -->
      <div class="mb-6 flex items-center gap-4">
        <UiUserAvatar :user="profileUser" size="lg" />
        <div>
          <p class="text-lg font-semibold text-fg">
            {{ profileName }}
          </p>
          <p
            v-if="isOwnProfile && profileUser.email"
            class="text-sm text-fg-muted mt-0.5"
          >
            {{ profileUser.email }}
          </p>
          <div
            v-if="memberInfo"
            class="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted"
          >
            <span
              :class="[
                'badge',
                memberInfo.role === 'owner' ? 'badge-warning' : 'badge-muted',
              ]"
            >
              {{ $t(`profile.currentHouse.${memberInfo.role}`) }}
            </span>
            <span>
              {{
                $t('profile.memberSince', {
                  date: formatShort(memberInfo.joined_at),
                })
              }}
            </span>
          </div>
        </div>
      </div>

      <UserProfile
        :user="profileUser"
        :member-info="memberInfo"
        :is-own-profile="!!isOwnProfile"
        :current-house="currentHouse"
        :update-profile="handleProfileUpdate"
      />

      <UserAccountPanel
        v-if="isOwnProfile"
        :current-house="currentHouse"
        :loading="loading"
        @sign-out="signOut"
      />

      <section
        v-if="isOwnProfile"
        aria-labelledby="profile-danger-heading"
        class="pb-6"
      >
        <h2
          id="profile-danger-heading"
          class="mb-3 font-semibold text-danger-fg"
        >
          {{ $t('gdpr.dangerZone') }}
        </h2>
        <GdprAccountDeletion
          :deleted-at="currentUser?.deleted_at ?? null"
          @deleted="navigateTo('/')"
        />
      </section>
    </UiContainer>
  </template>
</template>
