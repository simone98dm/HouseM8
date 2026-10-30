<script setup lang="ts">
/**
 * Native checkbox with the design-system skin. The real <input> stays in the
 * DOM (appearance-none), so semantics, keyboard, forms and `aria-*` attrs
 * passed by the caller all work as on a plain checkbox. Non-class attrs fall
 * through to the input; `class`/`style` go on the root row.
 */
defineOptions({ inheritAttrs: false });

interface CheckboxProps {
  id?: string;
  label?: string;
  disabled?: boolean;
}

const {
  id = undefined,
  label = undefined,
  disabled = false,
} = defineProps<CheckboxProps>();
const model = defineModel<boolean>({ default: false });
const slots = useSlots();
const attrs = useAttrs();

const generatedId = useId();
const inputId = computed(() => id ?? generatedId);
const hintId = computed(() => `${inputId.value}-hint`);

const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  const describedBy = [
    slots.hint ? hintId.value : undefined,
    rest['aria-describedby'] as string | undefined,
  ].filter(Boolean);
  return {
    ...rest,
    'aria-describedby': describedBy.length ? describedBy.join(' ') : undefined,
  };
});

const inputRef = ref<HTMLInputElement | null>(null);
defineExpose({ focus: () => inputRef.value?.focus() });
</script>

<template>
  <div :class="['flex items-start gap-3', attrs.class]" :style="attrs.style">
    <span
      class="ui-checkbox mt-0.5 grid size-5 shrink-0 transition-transform duration-100 ease-out active:scale-90 has-disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <input
        :id="inputId"
        ref="inputRef"
        v-model="model"
        v-bind="inputAttrs"
        type="checkbox"
        :disabled="disabled"
        class="peer col-start-1 row-start-1 size-5 cursor-pointer appearance-none rounded-md border-[1.5px] border-line-control bg-surface transition-colors duration-150 ease-out hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand checked:border-brand checked:bg-brand checked:hover:border-brand-hover checked:hover:bg-brand-hover aria-invalid:not-checked:border-danger aria-invalid:not-checked:bg-danger-subtle disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
      />
      <svg
        class="pointer-events-none col-start-1 row-start-1 size-3.5 place-self-center text-brand-on peer-disabled:opacity-50"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3.5 8.5l3 3 6-6.5"
          stroke="currentColor"
          stroke-width="2.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <div v-if="label || slots.default || slots.hint" class="min-w-0">
      <label
        v-if="label || slots.default"
        :for="inputId"
        :class="[
          'text-sm leading-snug select-none',
          disabled
            ? 'cursor-not-allowed text-fg-muted'
            : 'cursor-pointer text-fg',
        ]"
      >
        <slot>{{ label }}</slot>
      </label>
      <p v-if="slots.hint" :id="hintId" class="mt-0.5 text-xs text-fg-muted">
        <slot name="hint" />
      </p>
    </div>
  </div>
</template>

<style scoped>
/* The tick draws itself in on check and retracts faster on uncheck:
   motion reports the state change, nothing more. */
.ui-checkbox path {
  stroke-dasharray: 14;
  stroke-dashoffset: 14;
  transition: stroke-dashoffset 100ms ease-in;
}

.ui-checkbox input:checked + svg path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 220ms cubic-bezier(0.16, 1, 0.3, 1) 40ms;
}

@media (prefers-reduced-motion: reduce) {
  .ui-checkbox path,
  .ui-checkbox input:checked + svg path {
    transition: none;
  }
}
</style>
