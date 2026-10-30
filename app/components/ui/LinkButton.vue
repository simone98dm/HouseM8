<script lang="ts" setup>
import { BUTTON_SIZE_KEY } from '~/composables/useButtonStyles';
import type { RouteLocationRaw } from 'vue-router';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  outline?: boolean;
  to?: RouteLocationRaw;
}

interface ButtonEvents {
  click: [event: MouseEvent];
}

const {
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = undefined,
  fullWidth = false,
  outline = false,
  to = undefined,
} = defineProps<ButtonProps>();

const emit = defineEmits<ButtonEvents>();

const nuxtLink = resolveComponent('NuxtLink');

// <a>/<NuxtLink> has no CSS `:disabled` pseudo-class and ignores the
// `disabled` HTML attribute entirely (spec limitation — only form controls
// support it), so the old `:disabled="disabled || loading"` binding plus
// Tailwind's `disabled:` variant were both silently inert: a "disabled"
// LinkButton stayed fully clickable, keyboard-focusable and normal-looking.
// Fixed by computing state explicitly and applying it via aria-disabled +
// plain conditional classes instead of relying on the pseudo-class.
const isDisabled = computed(() => disabled || loading);

const handleClick = (event: MouseEvent) => {
  if (isDisabled.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
};

const { buttonClasses: styleFor, iconSizeClasses: iconSizeFor } =
  useButtonStyles();

// Inside the page header the header decides the size (see BUTTON_SIZE_KEY).
const containerSize = inject(BUTTON_SIZE_KEY, undefined);
const resolvedSize = computed(() => containerSize ?? size);

const buttonClasses = computed(() =>
  // Identical appearance to UiButton, from the same source. Only the disabled
  // treatment differs, because <a> ignores :disabled entirely.
  [
    styleFor({ variant, size: resolvedSize.value, outline, fullWidth }),
    // Global `a:hover` underlines; a button-styled link must not.
    'no-underline',
    isDisabled.value ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' '),
);

const formattedIcon = computed(() => {
  return `heroicons:${icon}`;
});

const iconSizeClasses = computed(() => iconSizeFor(resolvedSize.value));
</script>

<template>
  <!-- A disabled link is an <a> without href: inert and never navigates. -->
  <component
    :is="isDisabled ? 'a' : nuxtLink"
    :to="isDisabled ? undefined : to"
    :class="buttonClasses"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :tabindex="isDisabled ? -1 : undefined"
    @click="handleClick"
  >
    <Icon
      v-if="loading"
      name="heroicons:arrow-path"
      :class="[iconSizeClasses, 'animate-spin']"
      aria-hidden="true"
    />
    <Icon
      v-else-if="icon"
      :name="formattedIcon"
      :class="iconSizeClasses"
      aria-hidden="true"
    />
    <slot />
  </component>
</template>
