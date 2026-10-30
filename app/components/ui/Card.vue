<script lang="ts" setup>
interface CardProps {
  padding?: 'none' | 'sm' | 'normal' | 'lg';
  /** `brand` is the one emphasised card in a set (e.g. the recommended plan). */
  tone?: 'default' | 'brand';
  /**
   * Clickable cards only. Static cards never react to hover (DESIGN.md §4);
   * an interactive card lifts slightly and shows the brand focus outline
   * when its inner control has keyboard focus.
   */
  interactive?: boolean;
  /** Renders the card title in the header, above a hairline divider. */
  title?: string;
  /** Cards are `h3` under a page `h1` and section `h2` (DESIGN.md §3). */
  headingLevel?: 2 | 3 | 4;
  /** Root element tag, e.g. `article` or `section`. */
  as?: string;
}

const {
  padding = 'normal',
  tone = 'default',
  interactive = false,
  title,
  headingLevel = 3,
  as = 'div',
} = defineProps<CardProps>();

const slots = useSlots();

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  normal: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
} as const;

const TONE_CLASSES = {
  default: 'border border-line bg-surface',
  brand: 'border-2 border-brand bg-brand-subtle',
} as const;

const hasHeader = computed(
  () => Boolean(title) || Boolean(slots.header) || Boolean(slots.actions),
);

const rootClasses = computed(() => [
  // Column so a card stretched by a grid grows its body, keeping footers and
  // bottom-pinned actions aligned across a row of cards.
  'flex flex-col rounded-card',
  TONE_CLASSES[tone],
  // Edge-to-edge content (lists, tables) must not paint past the corners.
  padding === 'none' ? 'overflow-hidden' : '',
  interactive
    ? 'transition-shadow duration-150 hover:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand motion-reduce:transition-none'
    : '',
]);
</script>

<template>
  <component :is="as" :class="rootClasses">
    <div
      v-if="hasHeader"
      class="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5"
    >
      <slot name="header">
        <component
          :is="`h${headingLevel}`"
          class="min-w-0 text-base font-semibold text-fg"
        >
          {{ title }}
        </component>
      </slot>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div :class="['flex-1 space-y-4', PADDING_CLASSES[padding]]">
      <slot />
    </div>

    <div v-if="$slots.footer" class="border-t border-line px-4 py-3 sm:px-5">
      <slot name="footer" />
    </div>
  </component>
</template>
