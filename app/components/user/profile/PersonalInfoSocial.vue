<script setup lang="ts">
import type { User } from '~/types';

interface Props {
  user: User;
}

defineProps<Props>();
</script>

<template>
  <template
    v-if="
      user.telephone ||
      user.instagram ||
      user.twitter ||
      user.linkedin ||
      user.tiktok
    "
  >
    <div v-if="user.telephone" class="flex items-start gap-3">
      <div
        class="flex size-10 items-center justify-center rounded-lg bg-ok-subtle shrink-0"
      >
        <Icon
          name="heroicons:phone"
          class="h-5 w-5 text-ok-fg"
          aria-hidden="true"
        />
      </div>
      <div class="flex-1">
        <p class="text-xs font-medium text-fg-muted">
          {{ $t('user.phone') }}
        </p>
        <p class="text-sm font-semibold text-fg">
          {{ user.telephone }}
        </p>
      </div>
    </div>

    <div v-if="user.instagram" class="flex items-start gap-3">
      <div
        class="flex size-10 items-center justify-center rounded-lg bg-surface-hover shrink-0"
      >
        <Icon name="logos:instagram-icon" class="h-5 w-5" aria-hidden="true" />
      </div>
      <div class="flex-1">
        <p class="text-xs font-medium text-fg-muted">
          {{ $t('profile.social.instagram') }}
        </p>
        <a
          :href="`https://instagram.com/${user.instagram.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          @{{ user.instagram.replace('@', '') }}
        </a>
      </div>
    </div>

    <div v-if="user.twitter" class="flex items-start gap-3">
      <div
        class="flex size-10 items-center justify-center rounded-lg bg-brand-subtle shrink-0"
      >
        <Icon name="logos:twitter" class="h-5 w-5" aria-hidden="true" />
      </div>
      <div class="flex-1">
        <p class="text-xs font-medium text-fg-muted">
          {{ $t('profile.social.twitter') }}
        </p>
        <a
          :href="`https://twitter.com/${user.twitter.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          @{{ user.twitter.replace('@', '') }}
        </a>
      </div>
    </div>

    <div v-if="user.linkedin" class="flex items-start gap-3">
      <div
        class="flex size-10 items-center justify-center rounded-lg bg-brand-subtle shrink-0"
      >
        <Icon name="logos:linkedin-icon" class="h-5 w-5" aria-hidden="true" />
      </div>
      <div class="flex-1">
        <p class="text-xs font-medium text-fg-muted">
          {{ $t('profile.social.linkedin') }}
        </p>
        <a
          :href="
            user.linkedin.startsWith('http')
              ? user.linkedin
              : `https://linkedin.com/in/${user.linkedin}`
          "
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {{ user.linkedin }}
        </a>
      </div>
    </div>

    <div v-if="user.tiktok" class="flex items-start gap-3">
      <div
        class="flex size-10 items-center justify-center rounded-lg bg-surface-hover shrink-0"
      >
        <Icon name="logos:tiktok-icon" class="h-5 w-5" aria-hidden="true" />
      </div>
      <div class="flex-1">
        <p class="text-xs font-medium text-fg-muted">
          {{ $t('profile.social.tiktok') }}
        </p>
        <a
          :href="`https://tiktok.com/@${user.tiktok.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          @{{ user.tiktok.replace('@', '') }}
        </a>
      </div>
    </div>
  </template>
</template>
