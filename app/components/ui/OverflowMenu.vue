<script lang="ts" setup>
/**
 * UiOverflowMenu — a button that opens a small menu of actions.
 *
 * Keyboard: Enter/Space (native button click) or ArrowDown opens and focuses
 * the first item; ArrowUp/Down/Home/End move; Escape closes and returns focus
 * to the trigger; Tab or an outside click closes.
 *
 * The menu is teleported to <body> and `position: fixed`: the cards that host
 * it are `overflow-hidden` (rounded corners) and would clip an absolute menu.
 * A fixed menu does not follow its trigger, so scroll/resize dismiss it.
 *
 * Icon-only by default (pass `ariaLabel`); pass `label` for a visible text
 * trigger, in which case no aria-label is set (it would duplicate the text).
 */

export interface UiOverflowMenuItem {
  key: string;
  label: string;
  description?: string;
  danger?: boolean;
  /** Marks the current choice (e.g. the member's present role). */
  active?: boolean;
}

interface UiOverflowMenuProps {
  items: UiOverflowMenuItem[];
  ariaLabel?: string;
  label?: string;
}

interface UiOverflowMenuEvents {
  select: [key: string];
}

const {
  items,
  ariaLabel = undefined,
  label = undefined,
} = defineProps<UiOverflowMenuProps>();
const emit = defineEmits<UiOverflowMenuEvents>();

const MENU_WIDTH = 224;
const ITEM_HEIGHT = 44;
const MENU_PADDING = 8;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;

const menuId = useId();
const isOpen = ref(false);
const position = ref({ top: 0, left: 0 });
const triggerRef = ref<{ $el: HTMLElement } | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const triggerEl = () => triggerRef.value?.$el ?? null;

const place = (trigger: HTMLElement) => {
  const rect = trigger.getBoundingClientRect();
  const height = items.length * ITEM_HEIGHT + MENU_PADDING;
  const spaceBelow = globalThis.innerHeight - rect.bottom;
  const opensUpward =
    spaceBelow < height + VIEWPORT_MARGIN && rect.top > spaceBelow;
  position.value = {
    top: opensUpward
      ? Math.max(VIEWPORT_MARGIN, rect.top - height - TRIGGER_GAP)
      : rect.bottom + TRIGGER_GAP,
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        rect.right - MENU_WIDTH,
        globalThis.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
      ),
    ),
  };
};

const menuItems = () =>
  Array.from(
    menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
  );

const open = async () => {
  const trigger = triggerEl();
  if (!trigger || isOpen.value) return;
  place(trigger);
  isOpen.value = true;
  await nextTick();
  menuItems()[0]?.focus();
};

const close = (restoreFocus = false) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (restoreFocus) triggerEl()?.focus();
};

const toggle = () => (isOpen.value ? close() : open());

const choose = (key: string) => {
  close(true);
  emit('select', key);
};

const moveFocus = (delta: number | 'first' | 'last') => {
  const all = menuItems();
  if (all.length === 0) return;
  const current = all.indexOf(document.activeElement as HTMLElement);
  const next =
    delta === 'first'
      ? 0
      : delta === 'last'
        ? all.length - 1
        : (current + delta + all.length) % all.length;
  all[next]?.focus();
};

const onMenuKeydown = (event: KeyboardEvent) => {
  const handlers: Record<string, () => void> = {
    ArrowDown: () => moveFocus(1),
    ArrowUp: () => moveFocus(-1),
    Home: () => moveFocus('first'),
    End: () => moveFocus('last'),
    Escape: () => close(true),
    Tab: () => close(),
  };
  const handler = handlers[event.key];
  if (!handler) return;
  if (event.key !== 'Tab') event.preventDefault();
  handler();
};

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown') return;
  event.preventDefault();
  open();
};

const onOutsidePointer = (event: Event) => {
  const target = event.target as Node;
  if (menuRef.value?.contains(target) || triggerEl()?.contains(target)) return;
  close();
};

// ponytail: dismiss on scroll/resize instead of re-measuring.
watch(isOpen, (value) => {
  const method = value ? 'addEventListener' : 'removeEventListener';
  globalThis[method]('pointerdown', onOutsidePointer, true);
  globalThis[method]('scroll', dismiss, true);
  globalThis[method]('resize', dismiss);
});

function dismiss() {
  close();
}

onBeforeUnmount(() => {
  globalThis.removeEventListener('pointerdown', onOutsidePointer, true);
  globalThis.removeEventListener('scroll', dismiss, true);
  globalThis.removeEventListener('resize', dismiss);
});

defineExpose({ open });
</script>

<template>
  <UiButton
    ref="triggerRef"
    variant="ghost"
    size="sm"
    :class="label ? undefined : 'min-h-11 min-w-11'"
    :icon="label ? undefined : 'ellipsis-vertical'"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :aria-controls="isOpen ? menuId : undefined"
    :aria-label="label ? undefined : ariaLabel"
    @click="toggle"
    @keydown="onTriggerKeydown"
  >
    <template v-if="label">
      {{ label }}
      <Icon name="heroicons:chevron-down" class="size-3.5" aria-hidden="true" />
    </template>
  </UiButton>

  <Teleport to="body">
    <div
      v-if="isOpen"
      :id="menuId"
      ref="menuRef"
      role="menu"
      :aria-label="ariaLabel ?? label"
      class="fixed z-[var(--z-dropdown)] rounded-control border border-line bg-surface-raised py-1 shadow-lg"
      :style="{
        width: `${MENU_WIDTH}px`,
        top: `${position.top}px`,
        left: `${position.left}px`,
      }"
      @keydown="onMenuKeydown"
    >
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        role="menuitem"
        tabindex="-1"
        :class="[
          'flex min-h-11 w-full flex-col justify-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
          item.danger ? 'text-danger-fg' : 'text-fg',
        ]"
        @click="choose(item.key)"
      >
        <span :class="item.active ? 'font-semibold text-brand' : 'font-medium'">
          {{ item.label }}
        </span>
        <span v-if="item.description" class="text-xs text-fg-muted">
          {{ item.description }}
        </span>
      </button>
    </div>
  </Teleport>
</template>
