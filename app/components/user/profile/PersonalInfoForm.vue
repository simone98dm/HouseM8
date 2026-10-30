<script setup lang="ts">
import type { OccupationType, User } from '~/types';

const { t: $t, locale } = useI18n();

interface Props {
  user: User;
  isSaving?: boolean;
}

interface Emits {
  save: [data: Partial<User>];
  cancel: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const consentsStore = useConsentsStore();
const canShareProfile = computed(() => consentsStore.hasProfileSharing);
const consentFailed = ref(false);

// Opt-in: ticking the box IS the grant. Reverts (native checkbox) if it fails.
async function handleShareToggle(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.checked) return;
  consentFailed.value = false;
  const ok = await consentsStore.grant('profile_sharing');
  if (!ok) {
    input.checked = false;
    consentFailed.value = true;
  }
}

const form = ref({
  first_name: props.user.first_name || '',
  last_name: props.user.last_name || '',
  email: props.user.email || '',
  gender: props.user.gender || '',
  occupation_type: props.user.occupation_type || '',
  study_field: props.user.study_field || '',
  job_title: props.user.job_title || '',
  languages: [...(props.user.languages || [])],
  pets: props.user.pets || '',
  preferred_currency: props.user.preferred_currency || 'EUR',
  telephone: props.user.telephone || '',
  instagram: props.user.instagram || '',
  twitter: props.user.twitter || '',
  linkedin: props.user.linkedin || '',
  tiktok: props.user.tiktok || '',
});

const genderOptions = [
  { label: $t('profile.personal.genders.male'), value: 'male' },
  { label: $t('profile.personal.genders.female'), value: 'female' },
  { label: $t('profile.personal.genders.other'), value: 'other' },
  {
    label: $t('profile.personal.genders.preferNotToSay'),
    value: 'prefer_not_to_say',
  },
];

const occupationTypes = [
  { label: $t('profile.personal.occupationTypes.student'), value: 'student' },
  { label: $t('profile.personal.occupationTypes.worker'), value: 'worker' },
  { label: $t('profile.personal.occupationTypes.other'), value: 'other' },
];

const currencyNames = computed(
  () => new Intl.DisplayNames(locale.value, { type: 'currency' }),
);
const currencyOptions = computed(() =>
  (['USD', 'EUR'] as const).map((code) => ({
    label: `${code} - ${currencyNames.value.of(code)}`,
    value: code,
  })),
);

const showOccupationDetails = computed(
  () =>
    form.value.occupation_type === 'student' ||
    form.value.occupation_type === 'worker',
);

const buildUpdateData = (f: typeof form.value): Partial<User> => {
  const data: Partial<User> = {};
  // `email` is deliberately never sent: changing the sign-in address needs
  // password re-auth + confirmation via POST /api/users/me/email.
  const firstName = f.first_name.trim();
  const lastName = f.last_name.trim();
  if (firstName && firstName !== props.user.first_name)
    data.first_name = firstName;
  if (lastName && lastName !== props.user.last_name) data.last_name = lastName;
  if (f.preferred_currency)
    data.preferred_currency = f.preferred_currency as 'USD' | 'EUR';
  // Optional fields need the profile-sharing consent; the server rejects
  // them (403) otherwise, so never send them without it.
  if (!canShareProfile.value) return data;
  if (f.gender)
    data.gender = f.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say';
  if (f.occupation_type)
    data.occupation_type = f.occupation_type as OccupationType;
  if (f.study_field) data.study_field = f.study_field;
  if (f.job_title) data.job_title = f.job_title;
  if (f.languages.length > 0) data.languages = f.languages;
  // `users.pets` is a TEXT column and the server schema is `z.string()`. This
  // used to send the split array, which failed validation — so saving a profile
  // with any pet filled in returned 400 and silently lost the whole edit.
  const pets = (f.pets || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
  if (pets) data.pets = pets;
  if (f.telephone) data.telephone = f.telephone;
  if (f.instagram) data.instagram = f.instagram;
  if (f.twitter) data.twitter = f.twitter;
  if (f.linkedin) data.linkedin = f.linkedin;
  if (f.tiktok) data.tiktok = f.tiktok;
  return data;
};

const handleSave = () => {
  emit('save', buildUpdateData(form.value));
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div class="space-y-5">
    <fieldset class="space-y-4">
      <legend class="mb-1 text-sm font-semibold text-fg">
        {{ $t('profile.personal.identity') }}
      </legend>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiInput
          id="first_name"
          v-model="form.first_name"
          required
          autocomplete="given-name"
          :label="$t('profile.personal.firstName')"
          :placeholder="$t('profile.personal.firstNamePlaceholder')"
        />
        <UiInput
          id="last_name"
          v-model="form.last_name"
          required
          autocomplete="family-name"
          :label="$t('profile.personal.lastName')"
          :placeholder="$t('profile.personal.lastNamePlaceholder')"
        />
      </div>
      <UiInput
        id="email"
        v-model="form.email"
        type="email"
        disabled
        autocomplete="email"
        :label="$t('profile.personal.email')"
        :placeholder="$t('profile.personal.emailPlaceholder')"
        :hint="$t('profile.personal.emailLockedHint')"
      />
    </fieldset>

    <UiSelect
      id="preferred_currency"
      v-model="form.preferred_currency"
      :label="$t('profile.personal.preferredCurrency')"
      :options="currencyOptions"
    />

    <section
      class="space-y-4 border-t border-line pt-5"
      aria-labelledby="profile-sharing-heading"
    >
      <div>
        <h3 id="profile-sharing-heading" class="text-sm font-semibold text-fg">
          {{ $t('profile.sharing.title') }}
        </h3>
        <p class="mt-1 text-sm text-fg-muted">
          {{ $t('profile.sharing.purpose') }}
        </p>
      </div>

      <div v-if="!canShareProfile" class="rounded-control bg-surface-hover p-4">
        <UiCheckbox
          id="profile-sharing-optin"
          :disabled="consentsStore.isLoading"
          @change="handleShareToggle"
        >
          <span class="font-medium">{{ $t('profile.sharing.optIn') }}</span>
          <template #hint>
            {{ $t('profile.sharing.optInHint') }}
            <NuxtLink
              to="/privacy"
              target="_blank"
              class="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
            >
              {{ $t('profile.sharing.privacyLink') }}
            </NuxtLink>
          </template>
        </UiCheckbox>
        <p
          v-if="consentFailed"
          role="alert"
          class="mt-3 text-sm text-danger-fg"
        >
          {{ $t('profile.sharing.error') }}
        </p>
      </div>

      <template v-else>
        <p class="text-xs text-fg-muted">
          {{ $t('profile.sharing.active') }}
          <NuxtLink
            to="/settings/privacy"
            class="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
          >
            {{ $t('profile.sharing.manage') }}
          </NuxtLink>
        </p>

        <UiSelect
          id="gender"
          v-model="form.gender"
          :label="$t('profile.personal.gender')"
          :placeholder="$t('common.select')"
          :options="genderOptions"
        />

        <UiSelect
          id="occupation_type"
          v-model="form.occupation_type"
          :label="$t('profile.personal.occupationType')"
          :placeholder="$t('common.select')"
          :options="occupationTypes"
        />

        <div
          v-if="showOccupationDetails"
          class="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <UiInput
            v-if="form.occupation_type === 'student'"
            v-model="form.study_field"
            :label="$t('profile.personal.studyField')"
            :placeholder="$t('profile.personal.studyFieldPlaceholder')"
          />
          <UiInput
            v-if="form.occupation_type === 'worker'"
            v-model="form.job_title"
            :label="$t('profile.personal.jobTitle')"
            :placeholder="$t('profile.personal.jobTitlePlaceholder')"
          />
        </div>

        <UiChipInput
          v-model="form.languages"
          :label="$t('profile.personal.languages')"
          :placeholder="$t('profile.personal.languagesPlaceholder')"
          :add-button-text="$t('common.add')"
          :add-label="$t('a11y.buttons.addLanguage')"
        />

        <UiInput
          v-model="form.pets"
          :label="$t('profile.personal.pets')"
          :placeholder="$t('profile.personal.petsPlaceholder')"
        />

        <div class="pt-4 border-t border-line">
          <h3
            class="text-sm font-semibold text-fg-muted mb-4 flex items-center gap-2"
          >
            <Icon
              name="heroicons:chat-bubble-left-right"
              class="h-4 w-4"
              aria-hidden="true"
            />
            {{ $t('profile.personal.contactAndSocial') }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput
              v-model="form.telephone"
              :label="$t('profile.social.telephone')"
              :placeholder="$t('profile.social.telephonePlaceholder')"
              type="tel"
            />
            <UiInput
              v-model="form.instagram"
              :label="$t('profile.social.instagram')"
              placeholder="@username"
            />
            <UiInput
              v-model="form.twitter"
              :label="$t('profile.social.twitter')"
              placeholder="@username"
            />
            <UiInput
              v-model="form.linkedin"
              :label="$t('profile.social.linkedin')"
              placeholder="linkedin.com/in/username"
            />
            <UiInput
              v-model="form.tiktok"
              :label="$t('profile.social.tiktok')"
              placeholder="@username"
            />
          </div>
        </div>
      </template>
    </section>

    <div class="flex flex-wrap justify-end gap-2 pt-2">
      <UiButton type="button" variant="secondary" @click="handleCancel">
        {{ $t('common.cancel') }}
      </UiButton>
      <UiButton type="button" :loading="isSaving" @click="handleSave">
        {{ $t('common.save') }}
      </UiButton>
    </div>
  </div>
</template>
