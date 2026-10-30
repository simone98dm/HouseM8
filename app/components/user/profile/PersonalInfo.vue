<script setup lang="ts">
import type { User } from '~/types';

interface Props {
  user: User;
  isOwnProfile?: boolean;
  /** Resolves true when saved; the form then closes, else it stays open. */
  save: (data: Partial<User>) => Promise<boolean>;
}

const { user, isOwnProfile = false, save } = defineProps<Props>();
const { t } = useI18n();

const isEditMode = ref(false);
const isSaving = ref(false);
const card = ref<{ $el: HTMLElement } | null>(null);
const editButton = ref<{ $el: HTMLElement } | null>(null);

// Focus follows the swap: first field on Edit, Edit button on Save/Cancel.
const handleEdit = async () => {
  saveFailed.value = false;
  isEditMode.value = true;
  await nextTick();
  card.value?.$el
    .querySelector<HTMLElement>('input, select, textarea')
    ?.focus();
};
const closeEdit = async () => {
  isEditMode.value = false;
  await nextTick();
  editButton.value?.$el.focus();
};
const handleCancel = closeEdit;
const saveFailed = ref(false);
const handleSave = async (data: Partial<User>) => {
  if (isSaving.value) return;
  isSaving.value = true;
  saveFailed.value = false;
  try {
    if (await save(data)) await closeEdit();
    else saveFailed.value = true;
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div>
    <UiCard ref="card" as="section" aria-labelledby="profile-personal-heading">
      <template #header>
        <h2
          id="profile-personal-heading"
          class="min-w-0 text-base font-semibold text-fg"
        >
          {{ $t('profile.personalInformation') }}
        </h2>
      </template>
      <template v-if="isOwnProfile && !isEditMode" #actions>
        <UiButton
          ref="editButton"
          icon="pencil"
          variant="secondary"
          size="sm"
          aria-describedby="profile-personal-heading"
          @click="handleEdit"
        >
          {{ $t('common.edit') }}
        </UiButton>
      </template>

      <p
        v-if="isEditMode && saveFailed"
        class="text-sm text-danger-fg"
        role="alert"
      >
        {{ t('errors.failedToUpdateProfile') }}
      </p>
      <!-- Uploaded pictures are paused: avatars are drawn by Blobatar. -->
      <UserProfilePersonalInfoForm
        v-if="isEditMode"
        :user="user"
        :is-saving="isSaving"
        @save="handleSave"
        @cancel="handleCancel"
      />
      <UserProfilePersonalInfoView
        v-else
        :user="user"
        :is-own-profile="isOwnProfile"
      />
    </UiCard>
  </div>
</template>
