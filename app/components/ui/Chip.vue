<script setup lang="ts">
interface ChipBaseProps {
  icon?: string;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
}

// A chip is either selectable or removable, never both: the selectable chip is
// a <button> and a button cannot nest the remove <button>.
type ChipProps = ChipBaseProps &
  (
    | { selectable: true; removable?: false }
    | { selectable?: false; removable?: boolean }
  );

interface ChipEvents {
  click: [];
  remove: [];
}

const {
  icon = undefined,
  label,
  variant = 'default',
  size = 'md',
  selectable = false,
  selected = false,
  removable = false,
} = defineProps<ChipProps>();

const emit = defineEmits<ChipEvents>();

const chipClasses = computed(() => {
  const baseClasses =
    'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

  const interactiveClasses = selectable ? 'cursor-pointer' : '';

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  // Token classes flip with the theme on their own; no `dark:` pairs.
  const variantClasses = {
    default: selected
      ? 'bg-surface-hover text-fg border-2 border-line-control'
      : 'bg-surface-hover text-fg-muted border-2 border-transparent',
    primary: selected
      ? 'bg-brand text-brand-on border-2 border-brand'
      : 'bg-brand-subtle text-brand-hover border-2 border-transparent',
    success: selected
      ? 'bg-ok text-on-status border-2 border-ok'
      : 'bg-ok-subtle text-ok-fg border-2 border-transparent',
    warning: selected
      ? 'bg-warn text-on-status border-2 border-warn'
      : 'bg-warn-subtle text-warn-fg border-2 border-transparent',
    danger: selected
      ? 'bg-danger text-on-status border-2 border-danger'
      : 'bg-danger-subtle text-danger-fg border-2 border-transparent',
  };

  return [
    baseClasses,
    interactiveClasses,
    sizeClasses[size],
    variantClasses[variant],
  ].join(' ');
});

const iconSize = computed(() => {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  return sizes[size];
});

const handleClick = () => {
  if (selectable) {
    emit('click');
  }
};
</script>

<template>
  <component
    :is="selectable ? 'button' : 'span'"
    :type="selectable ? 'button' : undefined"
    :class="chipClasses"
    :aria-pressed="selectable ? selected : undefined"
    @click="handleClick"
  >
    <Icon v-if="icon" :name="icon" :class="iconSize" aria-hidden="true" />
    <span>{{ label }}</span>
    <!-- Raw: unpadded inline icon nested in the chip's pill shape; UiButton's
         padding/background would break it. Not rendered inside a selectable
         chip (a button cannot contain a button). -->
    <button
      v-if="removable && !selectable"
      type="button"
      :aria-label="$t('common.removeItem', { label })"
      class="-mr-1 inline-flex size-6 items-center justify-center rounded-full hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
      @click.stop="emit('remove')"
    >
      <Icon name="heroicons:x-mark" class="size-3" aria-hidden="true" />
    </button>
  </component>
</template>
