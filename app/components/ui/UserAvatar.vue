<script setup lang="ts">
import { blobatarUri } from 'blobatar/uri';
import type { User } from '~/types';

interface UserAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  user?: User | null;
  /** Provide a descriptive label for informative avatars. Omit for decorative usage and add aria-hidden="true" on the component element instead. */
  ariaLabel?: string;
  /** Draw from the typed name instead of the id (the sign-up preview only). */
  liveName?: boolean;
}

const {
  size = 'md',
  user = null,
  ariaLabel = undefined,
  liveName = false,
} = defineProps<UserAvatarProps>();

// Drawn by Blobatar (uploaded pictures are paused). The seed is the user id so
// one person has one face in every section; the name changes, the id does not.
// `liveName` is the sign-up preview, which forms as the name is typed. The hue
// is locked to the person's tone so it matches their name ink.
const seed = computed(() => {
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  if (liveName) return name || user?.id || user?.email || '?';
  return user?.id || name || user?.email || '?';
});
const tone = computed(() =>
  avatarTone(user?.id ?? `${user?.first_name ?? ''}${user?.last_name ?? ''}`),
);
const src = computed(() =>
  blobatarUri(seed.value, {
    background: 'circle',
    hue: AVATAR_HUES[tone.value],
  }),
);

const userAvatarSize = computed(() => {
  const sizes = {
    xs: 'size-6',
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-12',
  };

  return sizes[size] || sizes.md;
});
</script>

<template>
  <div
    :class="[userAvatarSize, 'shrink-0 select-none']"
    :role="ariaLabel ? 'img' : undefined"
    :aria-label="ariaLabel"
    :aria-hidden="ariaLabel ? undefined : 'true'"
  >
    <img :src="src" alt="" class="size-full" draggable="false" />
  </div>
</template>
