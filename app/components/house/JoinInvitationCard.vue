<script lang="ts" setup>
import type { House } from '~/types';

/**
 * HouseJoinInvitationCard — the "you're invited" card on the join page.
 * Guests (logged out) get the public preview (house name, roommate count) and
 * sign-up / sign-in links that return here; signed-in users get the house
 * summary and the accept/decline actions. Pure presentation; the page owns
 * the invitation state and API calls.
 */
interface Preview {
  house_name: string;
  member_count: number;
}

interface Props {
  house?: House | null;
  preview?: Preview | null;
  error?: string;
  isAuthenticated: boolean;
  userInHouse: boolean;
  accepting?: boolean;
  currentUserId?: string;
  fullPath: string;
}

interface Events {
  accept: [];
}

const {
  house = null,
  preview = null,
  error,
  isAuthenticated,
  userInHouse,
  accepting = false,
  currentUserId,
  fullPath,
} = defineProps<Props>();
const emit = defineEmits<Events>();

const encodedPath = computed(() => encodeURIComponent(fullPath));

const { formatShort } = useDate();
</script>

<template>
  <UiCard padding="lg">
    <div v-if="!isAuthenticated" class="space-y-6 text-center">
      <div>
        <p class="text-sm text-fg-muted">{{ $t('join.youreInvitedTo') }}</p>
        <h2 class="mt-1 text-2xl font-semibold text-fg">
          {{ preview?.house_name }}
        </h2>
        <p class="mt-1 text-sm text-fg-muted">
          {{ $t('join.memberCount', preview?.member_count ?? 0) }}
        </p>
        <p class="badge-success mt-3 inline-flex items-center gap-1">
          <Icon name="heroicons:gift" class="size-4" aria-hidden="true" />
          {{ $t('join.referralReward') }}
        </p>
      </div>

      <div class="space-y-3">
        <UiLinkButton
          :to="`/auth/register?redirect=${encodedPath}`"
          size="lg"
          full-width
        >
          {{ $t('join.createAccount') }}
        </UiLinkButton>
        <UiLinkButton
          :to="`/auth/login?redirect=${encodedPath}`"
          variant="secondary"
          size="lg"
          full-width
        >
          {{ $t('join.haveAccount') }}
        </UiLinkButton>
      </div>
    </div>

    <template v-else-if="house">
      <div class="rounded-control bg-surface-hover p-4">
        <h2 class="mb-3 text-lg font-semibold text-fg">
          {{ house.name }}
        </h2>
        <div class="space-y-2 text-sm text-fg-muted">
          <div v-if="house.address" class="flex items-center gap-2">
            <Icon
              name="heroicons:map-pin"
              class="h-4 w-4 shrink-0 text-fg-subtle"
              aria-hidden="true"
            />
            <span>{{ house.address }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon
              name="heroicons:calendar-days"
              class="h-4 w-4 shrink-0 text-fg-subtle"
              aria-hidden="true"
            />
            <span>
              {{ $t('invitation.createdAt') }}:
              {{ formatShort(house.created_at) }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="state-card state-card--error"
        role="alert"
        aria-live="assertive"
      >
        <Icon
          name="heroicons:exclamation-circle"
          class="mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <p class="text-sm">{{ error }}</p>
      </div>

      <div class="space-y-3">
        <div
          v-if="userInHouse"
          class="state-card state-card--warning"
          role="alert"
          aria-live="polite"
        >
          <Icon
            name="heroicons:exclamation-triangle"
            class="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <div class="text-sm">
            <p>{{ $t('invitation.userInHouse') }}</p>
            <NuxtLink
              :to="`/user/${currentUserId}`"
              class="mt-1 block font-medium underline hover:no-underline"
            >
              {{ $t('invitation.leaveCurrentHouseLink') }}
            </NuxtLink>
          </div>
        </div>

        <template v-else>
          <UiButton
            variant="primary"
            class="w-full"
            :loading="accepting"
            @click="emit('accept')"
          >
            {{ $t('invitation.acceptInvitation') }}
          </UiButton>

          <UiButton
            variant="secondary"
            class="w-full"
            @click="navigateTo('/dashboard')"
          >
            {{ $t('invitation.decline') }}
          </UiButton>
        </template>
      </div>
    </template>
  </UiCard>
</template>
