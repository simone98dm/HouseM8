<script setup lang="ts">
import type { User } from '~/types';

interface Props {
  user: User;
  isOwnProfile?: boolean;
}

interface Emits {
  save: [data: Partial<User>];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { isEnabled } = useFeatureFlags();
const userApi = useUserApi();
const notificationStore = useNotificationStore();
const { t } = useI18n();

const consentsStore = useConsentsStore();
const canUploadPictures = computed(() => isEnabled('showProfilePicture'));
// Uploading is an optional profile field: gated by the profile-sharing
// consent. Deleting stays available regardless (erasure is never gated).
const canAddPictures = computed(
  () => canUploadPictures.value && consentsStore.hasProfileSharing,
);
const canAddMore = computed(
  () => (props.user.profile_pictures?.length ?? 0) < 6,
);

const newPicture = ref<File | null>(null);
const isUploading = ref(false);
const isDeleting = ref<number | null>(null);

const handleUpload = async () => {
  if (!newPicture.value) return;
  isUploading.value = true;
  try {
    const result = await userApi.uploadPicture(newPicture.value);
    if (result) {
      emit('save', { profile_pictures: result.user.profile_pictures });
      newPicture.value = null;
    } else {
      notificationStore.error(
        t('common.error'),
        t('profile.pictures.uploadError'),
      );
    }
  } finally {
    isUploading.value = false;
  }
};

const handleDeletePicture = async (index: number) => {
  isDeleting.value = index;
  try {
    const updatedUser = await userApi.deletePicture(index);
    if (updatedUser) {
      emit('save', { profile_pictures: updatedUser.profile_pictures });
    } else {
      notificationStore.error(
        t('common.error'),
        t('profile.pictures.deleteError'),
      );
    }
  } finally {
    isDeleting.value = null;
  }
};
</script>

<template>
  <div
    v-if="user.profile_pictures && user.profile_pictures.length > 0"
    class="relative"
  >
    <UiCarousel :images="user.profile_pictures" :show-thumbnails="true" />
    <div
      v-if="isOwnProfile && canUploadPictures"
      class="mt-2 flex flex-wrap gap-2"
    >
      <UiButton
        v-for="(_, idx) in user.profile_pictures"
        :key="idx"
        variant="ghost"
        size="sm"
        :disabled="isDeleting !== null"
        :aria-label="`${$t('common.remove')} ${idx + 1}`"
        @click="handleDeletePicture(idx)"
      >
        <Icon
          name="heroicons:trash"
          class="h-4 w-4 text-danger-fg"
          aria-hidden="true"
        />
        {{ idx + 1 }}
      </UiButton>
    </div>
  </div>

  <div v-if="isOwnProfile && canAddPictures && canAddMore" class="mt-4">
    <p class="text-xs text-fg-muted mb-2">
      {{ $t('profile.pictures.description', { max: 6 }) }}
    </p>
    <UiPictureUpload v-model="newPicture" />
    <UiButton
      v-if="newPicture"
      class="mt-2"
      :disabled="isUploading"
      @click="handleUpload"
    >
      {{ $t('common.upload') }}
    </UiButton>
  </div>
</template>
