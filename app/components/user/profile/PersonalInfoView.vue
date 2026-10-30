<script setup lang="ts">
import type { User } from '~/types';

interface Props {
  user: User;
  isOwnProfile?: boolean;
}

const { user, isOwnProfile = false } = defineProps<Props>();

const { t, te } = useI18n();
const GENDER_KEYS: Record<string, string> = {
  male: 'male',
  female: 'female',
  other: 'other',
  prefer_not_to_say: 'preferNotToSay',
};
const getGenderDisplay = (g: string) =>
  GENDER_KEYS[g] ? t(`profile.personal.genders.${GENDER_KEYS[g]}`) : g;

const hasContacts = computed(
  () =>
    !!(
      user.telephone ||
      user.instagram ||
      user.twitter ||
      user.linkedin ||
      user.tiktok
    ),
);

const getOccupationDisplay = (u: User) => {
  if (!u.occupation_type) return '';
  const key = `profile.personal.occupationTypes.${u.occupation_type}`;
  let base = te(key) ? t(key) : u.occupation_type;
  if (u.occupation_type === 'student' && u.study_field)
    base += ` - ${u.study_field}`;
  if (u.occupation_type === 'worker' && u.job_title)
    base += ` - ${u.job_title}`;
  return base;
};

const hasNoInformation = computed(
  () =>
    isOwnProfile &&
    !user.gender &&
    !user.occupation_type &&
    (!user.languages || user.languages.length === 0) &&
    !user.pets &&
    !user.telephone &&
    !user.instagram &&
    !user.twitter &&
    !user.linkedin &&
    !user.tiktok,
);
</script>

<template>
  <div v-if="hasNoInformation" class="text-center py-8">
    <Icon
      name="heroicons:user-circle"
      class="mx-auto h-10 w-10 text-fg-subtle mb-3"
      aria-hidden="true"
    />
    <p class="text-sm text-fg-muted mb-1">
      {{ $t('profile.personal.noInformation') }}
    </p>
    <p class="text-xs text-fg-muted">
      {{ $t('profile.personal.clickEditToAdd') }}
    </p>
  </div>

  <div v-else class="grid gap-3 sm:grid-cols-2">
    <UserProfileInfoField
      v-if="user.gender"
      icon="heroicons:user"
      icon-bg-class="bg-brand-subtle"
      icon-color-class="text-brand-hover"
      :label="$t('profile.personal.gender')"
      :value="getGenderDisplay(user.gender)"
    />

    <UserProfileInfoField
      v-if="user.occupation_type"
      icon="heroicons:briefcase"
      icon-bg-class="bg-warn-subtle"
      icon-color-class="text-warn-fg"
      :label="$t('profile.personal.occupationType')"
      :value="getOccupationDisplay(user)"
      value-class="capitalize"
    />

    <UserProfileInfoField
      v-if="user.languages && user.languages.length > 0"
      icon="heroicons:language"
      icon-bg-class="bg-brand-subtle"
      icon-color-class="text-brand-hover"
      :label="$t('profile.personal.languages')"
    >
      <div class="mt-1 flex flex-wrap gap-1">
        <span
          v-for="language in user.languages"
          :key="language"
          class="badge badge-muted"
        >
          {{ language }}
        </span>
      </div>
    </UserProfileInfoField>

    <UserProfileInfoField
      v-if="user.pets"
      icon="heroicons:heart"
      icon-bg-class="bg-danger-subtle"
      icon-color-class="text-danger-fg"
      :label="$t('profile.personal.pets')"
    >
      <p class="text-sm font-semibold text-fg">
        {{ user.pets }}
      </p>
    </UserProfileInfoField>

    <UserProfileInfoField
      v-if="user.preferred_currency"
      icon="heroicons:currency-dollar"
      icon-bg-class="bg-ok-subtle"
      icon-color-class="text-ok-fg"
      :label="$t('profile.personal.preferredCurrency')"
      :value="user.preferred_currency"
    />

    <div v-if="hasContacts" class="border-t border-line pt-4 sm:col-span-2">
      <h3 class="mb-3 text-sm font-semibold text-fg-muted">
        {{ $t('profile.personal.contactAndSocial') }}
      </h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <UserProfilePersonalInfoSocial :user="user" />
      </div>
    </div>
  </div>
</template>
