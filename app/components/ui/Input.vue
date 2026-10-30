<script lang="ts" setup>
interface InputProps {
  id?: string;
  type?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  rows?: number;
  hint?: string;
  ariaLabel?: string;
}

interface InputEvents {
  blur: [];
  focus: [];
}

const {
  id = undefined,
  type = 'text',
  placeholder = undefined,
  disabled = false,
  required = false,
  error = false,
  size = 'md',
  label = undefined,
  rows = 3,
  hint = undefined,
  ariaLabel = undefined,
} = defineProps<InputProps>();

const modelValue = defineModel<string | number>({ default: '' });

const generatedId = useId();
const generatedHintId = useId();
const finalId = computed(() => id ?? generatedId);
const hintId = computed(() => (hint ? generatedHintId : undefined));

const slots = useSlots();
const attrs = useAttrs();

// The hint owns `aria-describedby`, merged with any caller-supplied reference.
const describedBy = computed(() =>
  mergeDescribedBy(hintId.value, attrs['aria-describedby']),
);

defineEmits<InputEvents>();

// Without this, undeclared native attributes (min, max, step, pattern, ...)
// fall through to the root <div> below instead of the <input>/<textarea>,
// silently disabling them. See bill/EditModal.vue, bill/Modal.vue,
// house/Modal.vue for call sites that rely on `:min`/`:max` reaching the
// input.
defineOptions({ inheritAttrs: false });

const isTextarea = computed(() => type === 'textarea');

const { fieldClasses } = useFieldStyles();

// `pl-10` clears the absolutely-positioned leading icon (emitted after `px-*`).
const inputClasses = computed(
  () =>
    `${fieldClasses({ size, error, disabled })}${slots.icon ? ' pl-10' : ''}`,
);
</script>

<template>
  <div class="space-y-1.5">
    <!-- `label-append` puts an action on the label's own line (login's
         "forgot password?" link) without a second copy of the label
         styling at the call site. -->
    <div
      v-if="label || $slots['label-append']"
      class="flex items-baseline justify-between gap-2"
    >
      <label
        v-if="label"
        :for="finalId"
        class="block text-sm font-semibold text-fg"
      >
        {{ label }}
        <span v-if="required" class="text-danger ml-0.5" aria-hidden="true"
          >*</span
        >
      </label>
      <slot name="label-append" />
    </div>

    <div class="relative">
      <span
        v-if="$slots.icon"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted [&_svg]:size-4"
        aria-hidden="true"
      >
        <slot name="icon" />
      </span>

      <component
        :is="isTextarea ? 'textarea' : 'input'"
        v-bind="$attrs"
        :id="finalId"
        :type="isTextarea ? undefined : type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :rows="isTextarea ? rows : undefined"
        :class="inputClasses"
        :aria-label="!label ? ariaLabel : undefined"
        :aria-invalid="error"
        :aria-required="required"
        :aria-describedby="describedBy"
        @input="
          modelValue = ($event.target as HTMLInputElement | HTMLTextAreaElement)
            .value
        "
        @blur="$emit('blur')"
        @focus="$emit('focus')"
      />
    </div>

    <!-- An error hint is a validation result the user must hear, not a static
         helper line — hence role="alert" only in the error state. -->
    <p
      v-if="hint"
      :id="hintId"
      :role="error ? 'alert' : undefined"
      class="text-xs"
      :class="error ? 'text-danger-fg' : 'text-fg-muted'"
    >
      {{ hint }}
    </p>
  </div>
</template>
