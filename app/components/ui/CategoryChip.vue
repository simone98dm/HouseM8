<script setup lang="ts">
import type { ExpenseCategory } from '~~/shared/constants/categories';
import { CATEGORY_META } from '~/constants/categories';

const {
  category,
  icon,
  size = 'md',
  showLabel = false,
} = defineProps<{
  category: ExpenseCategory;
  /** Override the category icon (e.g. the rent key). */
  icon?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}>();

const meta = computed(() => CATEGORY_META[category]);
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2">
    <span
      :class="[
        'flex shrink-0 items-center justify-center rounded-control',
        size === 'sm' ? 'size-8' : 'size-10',
        meta.tintClass,
        meta.fgClass,
      ]"
      aria-hidden="true"
    >
      <Icon
        :name="icon ?? meta.icon"
        :class="size === 'sm' ? 'size-4' : 'size-6'"
      />
    </span>
    <span v-if="showLabel" class="truncate text-sm font-medium text-fg">
      {{ $t(meta.i18nKey) }}
    </span>
  </span>
</template>
