<script setup lang="ts">
interface Option {
  label: string;
  value: string | number;
}

interface SelectProps {
  id?: string;
  options: Option[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  ariaLabel?: string;
  hint?: string;
}

const {
  id = undefined,
  options,
  label = undefined,
  placeholder = undefined,
  disabled = false,
  error = false,
  required = false,
  ariaLabel = undefined,
  hint = undefined,
} = defineProps<SelectProps>();

const modelValue = defineModel<string | number | null>({ required: true });

const generatedId = useId();
const generatedHintId = useId();
const inputId = computed(() => id ?? generatedId);
const hintId = computed(() => (hint ? generatedHintId : undefined));
const attrs = useAttrs();
const describedBy = computed(() =>
  mergeDescribedBy(hintId.value, attrs['aria-describedby']),
);

// Undeclared attributes (name, autocomplete, data-*, ...) belong on the <select>.
defineOptions({ inheritAttrs: false });

const { fieldClasses } = useFieldStyles();
const selectClasses = computed(
  () =>
    `${fieldClasses({ error, disabled })}${disabled ? '' : ' cursor-pointer'}`,
);
</script>

<template>
  <div class="space-y-1.5">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-semibold text-fg"
    >
      {{ label }}
      <span v-if="required" class="text-danger ml-0.5" aria-hidden="true"
        >*</span
      >
    </label>
    <select
      v-bind="$attrs"
      :id="inputId"
      v-model="modelValue"
      :disabled="disabled"
      :aria-label="!label ? ariaLabel : undefined"
      :aria-invalid="error"
      :aria-required="required"
      :aria-describedby="describedBy"
      :class="selectClasses"
    >
      <option v-if="placeholder" disabled value="">
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
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
