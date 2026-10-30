<script lang="ts" setup>
/**
 * UiSkeleton - placeholder block shaped like the content it stands in for.
 * Size it with classes (`class="h-4 w-40"`) or the props; props win only when
 * passed, so class sizes are never overridden by a default inline style.
 * Static on purpose: DESIGN.md bans pulse-forever motion. Decorative, so the
 * surrounding `role="status"` region carries the loading label.
 */

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  rounded?: string;
}

const { height, width, rounded } = defineProps<SkeletonProps>();

const attrs = useAttrs();
const callerClass = computed(() => String(attrs.class ?? ''));

const toCss = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value;

const sizeStyle = computed(() => ({
  height: toCss(height),
  width: toCss(width),
}));

const classes = computed(() => [
  'block bg-surface-hover',
  // Fall back only when the caller set neither a prop nor a class for it.
  height === undefined && !/(^|\s)(h|size)-/.test(callerClass.value)
    ? 'h-5'
    : '',
  rounded ??
    (/(^|\s)rounded(-|\s|$)/.test(callerClass.value) ? '' : 'rounded-control'),
]);
</script>

<template>
  <div :class="classes" :style="sizeStyle" aria-hidden="true" />
</template>
