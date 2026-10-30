<script lang="ts" setup>
import { BUTTON_SIZE_KEY } from '~/composables/useButtonStyles';
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  icon?: string;
  fullWidth?: boolean;
  outline?: boolean;
}

interface ButtonEvents {
  click: [event: MouseEvent];
}

const {
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  success = false,
  icon = undefined,
  fullWidth = false,
  outline = false,
} = defineProps<ButtonProps>();

const emit = defineEmits<ButtonEvents>();

// While loading the button stays natively enabled (aria-disabled instead) so a
// focused button that starts a request keeps focus; clicks are swallowed here,
// including submit, so a form cannot submit twice.
const handleClick = (event: MouseEvent) => {
  if (loading) {
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
  // `disabled:` variants are appended here, not in the shared source: <a> has
  // no :disabled pseudo-class, so UiLinkButton applies its own instead.
  [
    styleFor({ variant, size: resolvedSize.value, outline, fullWidth }),
    'disabled:opacity-50 disabled:cursor-not-allowed',
    loading ? 'opacity-50 cursor-not-allowed' : '',
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
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled"
    :aria-disabled="loading || undefined"
    :aria-busy="loading || undefined"
    @click="handleClick"
  >
    <Icon
      v-if="loading"
      name="heroicons:arrow-path"
      :class="[iconSizeClasses, 'animate-spin']"
      aria-hidden="true"
    />
    <Icon
      v-else-if="success"
      name="heroicons:check"
      :class="[iconSizeClasses, 'animate-scale-in']"
      aria-hidden="true"
    />
    <Icon
      v-else-if="icon"
      :name="formattedIcon"
      :class="iconSizeClasses"
      aria-hidden="true"
    />
    <!-- Keep the label while succeeded so the button keeps its accessible name. -->
    <span v-if="success" class="sr-only"><slot /></span>
    <slot v-else />
  </button>
</template>
