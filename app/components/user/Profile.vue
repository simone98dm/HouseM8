<script lang="ts" setup>
import type { User, HouseMember, House } from '~/types';

interface UserProfileProps {
  user?: User | null;
  memberInfo?: HouseMember | null;
  isOwnProfile?: boolean;
  currentHouse?: House | null;
  /** Resolves true when the profile was saved. */
  updateProfile: (payload: Partial<User>) => Promise<boolean>;
}

const props = defineProps<UserProfileProps>();

const { formatShort } = useDate();
const consentsStore = useConsentsStore();

// The optional-field gate in the edit form depends on the consent state.
onMounted(() => {
  if (props.isOwnProfile) consentsStore.loadConsents();
});
const router = useRouter();
const leaveModalOpen = ref(false);
const leaveButton = ref<{ $el?: HTMLElement } | null>(null);

// The dialog unmounts with its v-if, so hand focus back to the trigger.
const closeLeaveModal = async () => {
  leaveModalOpen.value = false;
  await nextTick();
  leaveButton.value?.$el?.focus();
};

const handleLeftHouse = () => {
  leaveModalOpen.value = false;
  router.push('/dashboard');
};

// Safe computed properties with null checks
const hasPersonalInfo = computed(() => {
  if (!props.user) return false;
  // Always show for own profile, even if empty
  if (props.isOwnProfile) return true;
  return !!(
    props.user.gender ||
    props.user.occupation_type ||
    (props.user.languages && props.user.languages.length > 0) ||
    props.user.pets ||
    props.user.instagram ||
    props.user.twitter ||
    props.user.linkedin ||
    props.user.tiktok ||
    props.user.telephone
  );
});

const profileName = computed(() =>
  `${props.user?.first_name ?? ''} ${props.user?.last_name ?? ''}`.trim(),
);

const formatMemberDate = (dateString: string) => formatShort(dateString);
</script>

<template>
  <div v-if="user" class="space-y-6">
    <UserProfilePersonalInfo
      v-if="hasPersonalInfo && user"
      :user="user"
      :is-own-profile="isOwnProfile"
      :save="updateProfile"
    />

    <UiCard
      v-else-if="!isOwnProfile"
      as="section"
      aria-labelledby="profile-personal-heading"
    >
      <template #header>
        <h2
          id="profile-personal-heading"
          class="min-w-0 text-base font-semibold text-fg"
        >
          {{ $t('profile.personalInformation') }}
        </h2>
      </template>
      <p class="text-sm text-fg-muted">
        {{
          $t('user.noDetails', { name: profileName || $t('user.unknownUser') })
        }}
      </p>
    </UiCard>

    <UiCard
      v-if="memberInfo"
      as="section"
      aria-labelledby="profile-house-heading"
    >
      <template #header>
        <h2
          id="profile-house-heading"
          class="min-w-0 text-base font-semibold text-fg"
        >
          {{ $t('profile.currentHouse.title') }}
        </h2>
      </template>
      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div v-if="currentHouse">
          <dt class="text-xs font-medium text-fg-muted">
            {{ $t('profile.currentHouse.name') }}
          </dt>
          <dd class="mt-1 text-sm font-semibold">
            <NuxtLink
              :to="`/house/${currentHouse.id}`"
              class="rounded-control text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {{ currentHouse.name }}
            </NuxtLink>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-fg-muted">
            {{ $t('profile.currentHouse.role') }}
          </dt>
          <dd class="mt-1">
            <span
              :class="[
                'badge',
                memberInfo.role === 'owner' ? 'badge-warning' : 'badge-muted',
              ]"
            >
              {{ $t(`profile.currentHouse.${memberInfo.role}`) }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-fg-muted">
            {{ $t('profile.currentHouse.joinedHouse') }}
          </dt>
          <dd class="mt-1 text-sm font-semibold text-fg">
            {{ formatMemberDate(memberInfo.joined_at) }}
          </dd>
        </div>
      </dl>

      <template v-if="isOwnProfile" #footer>
        <UiButton
          ref="leaveButton"
          variant="danger"
          size="sm"
          outline
          :disabled="!currentHouse"
          @click="leaveModalOpen = true"
        >
          {{ $t('profile.currentHouse.leaveHouse') }}
        </UiButton>
      </template>
    </UiCard>

    <UserLeaveHouseModal
      v-if="leaveModalOpen && currentHouse && memberInfo"
      :house-id="currentHouse.id"
      :house-name="currentHouse.name"
      :is-owner="memberInfo.role === 'owner'"
      @close="closeLeaveModal"
      @left="handleLeftHouse"
    />
  </div>
</template>
