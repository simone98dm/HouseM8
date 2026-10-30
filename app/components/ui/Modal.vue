<script lang="ts">
// Shared across every open modal so nested/stacked modals don't unlock the
// page while another is still open.
let scrollLockCount = 0;
let scrollLockPrevious = '';

const lockScroll = () => {
  if (scrollLockCount === 0) {
    scrollLockPrevious = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  scrollLockCount++;
};

const unlockScroll = () => {
  if (scrollLockCount === 0) return;
  scrollLockCount--;
  if (scrollLockCount === 0) {
    document.documentElement.style.overflow = scrollLockPrevious;
  }
};
</script>

<script setup lang="ts">
interface UiModalProps {
  show: boolean;
  title?: string;
  maxWidth?: string;
  role?: 'dialog' | 'alertdialog';
  /** No close on Escape / backdrop click. The close button still works. */
  persistent?: boolean;
  /** `form` renders the panel as a <form> and emits `submit`. */
  as?: 'div' | 'form';
}

interface ModalEvents {
  close: [];
  submit: [event: SubmitEvent];
}

defineOptions({ inheritAttrs: false });

const {
  show,
  title = '',
  maxWidth = 'max-w-lg',
  role = 'dialog',
  persistent = false,
  as = 'div',
} = defineProps<UiModalProps>();

const emit = defineEmits<ModalEvents>();
const modalId = useId();
const dialogRef = ref<HTMLElement | null>(null);
let previousFocus: Element | null = null;
let isLocked = false;

const FOCUSABLE =
  'button, [href], input, select, textarea, summary, [contenteditable], [tabindex]:not([tabindex="-1"])';

const getFocusable = (): HTMLElement[] => {
  if (!dialogRef.value) return [];
  return Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter(
    (el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null,
  );
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (!persistent) emit('close');
    return;
  }
  if (e.key === 'Tab') {
    const focusable = getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
};

const handleBackdropClick = () => {
  if (!persistent) emit('close');
};

const release = () => {
  if (!isLocked) return;
  isLocked = false;
  unlockScroll();
};

watch(
  () => show,
  (val) => {
    if (!import.meta.client) return;
    if (val) {
      previousFocus = document.activeElement;
      if (!isLocked) {
        isLocked = true;
        lockScroll();
      }
      // First field, else the first footer action (Cancel, the least
      // destructive), else the close button — never the X before a field.
      nextTick(() => {
        const focusable = getFocusable();
        const inBody = (el: HTMLElement) =>
          !!el.closest('[data-modal-body], [data-modal-footer]');
        (focusable.find(inBody) ?? focusable[0])?.focus();
      });
    } else {
      release();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }
  },
  { immediate: true },
);

onBeforeUnmount(release);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center sm:p-4"
        @keydown="handleKeydown"
      >
        <!-- Scrim: plain token fill, no blur (DESIGN.md §4). -->
        <div
          class="modal-backdrop absolute inset-0 z-[var(--z-backdrop)] bg-fg/50"
          aria-hidden="true"
          @click="handleBackdropClick"
        />
        <component
          :is="as"
          ref="dialogRef"
          :role="role"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? modalId : undefined"
          v-bind="$attrs"
          class="modal-content relative z-[var(--z-modal)] flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-card border border-b-0 border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] text-fg shadow-lg sm:rounded-card sm:border-b sm:pb-0"
          :class="maxWidth"
          @submit.prevent="
            as === 'form' && emit('submit', $event as SubmitEvent)
          "
        >
          <div
            v-if="title || $slots.header"
            class="flex items-center justify-between gap-3 border-b border-line px-6 py-4"
          >
            <slot name="header">
              <h2 :id="modalId" class="text-lg font-semibold text-fg">
                {{ title }}
              </h2>
            </slot>
            <!-- Raw: icon-only close with a 44px hit area; UiButton has no
                 square icon-only mode. -->
            <button
              type="button"
              class="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              :aria-label="$t('a11y.close')"
              @click="emit('close')"
            >
              <Icon name="heroicons:x-mark" class="size-6" aria-hidden="true" />
            </button>
          </div>

          <div data-modal-body class="overflow-y-auto p-6">
            <slot />
          </div>

          <!-- Phones: stacked full-width, primary on top, Cancel nearest the
               thumb. From sm: one row, primary on the right. -->
          <div
            v-if="$slots.footer"
            data-modal-footer
            class="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 max-sm:[&>*]:w-full sm:flex-row sm:justify-end"
          >
            <slot name="footer" />
          </div>
        </component>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease-out;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 180ms ease-out;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(8px);
}

/* Phones: the panel is a bottom sheet, so it rises from the edge it sits on. */
@media (max-width: 639.98px) {
  .modal-enter-active .modal-content,
  .modal-leave-active .modal-content {
    transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-enter-from .modal-content,
  .modal-leave-to .modal-content {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-content,
  .modal-leave-active .modal-content {
    transition: none;
  }
}
</style>
