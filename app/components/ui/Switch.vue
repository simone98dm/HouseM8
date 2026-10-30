<script setup lang="ts">
interface SwitchProps {
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const {
  label = undefined,
  ariaLabel = undefined,
  disabled = false,
  size = 'md',
} = defineProps<SwitchProps>();
const modelValue = defineModel<boolean>({ required: true });
const labelId = useId();
const switchId = useId();

const toggle = () => {
  if (!disabled) {
    modelValue.value = !modelValue.value;
  }
};

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-7',
  };
  return sizes[size];
});

const knobSizeClasses = computed(() => {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  return sizes[size];
});

const translateClasses = computed(() => {
  const sizes = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
    lg: 'translate-x-7',
  };
  return sizes[size];
});

const labelSizeClasses = computed(() => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
  };
  return sizes[size];
});
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Raw by design: this IS the toggle-switch primitive (role="switch",
         aria-checked); UiButton has no switch semantics to delegate to. -->
    <button
      :id="switchId"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-labelledby="label ? labelId : undefined"
      :aria-label="!label ? ariaLabel : undefined"
      :disabled="disabled"
      :class="[
        'relative inline-flex shrink-0 rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        sizeClasses,
        modelValue ? 'bg-brand' : 'bg-line-control',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]"
      @click="toggle"
    >
      <span
        :class="[
          'pointer-events-none absolute top-1/2 -translate-y-1/2 transform rounded-full bg-white shadow-sm transition-transform duration-150 ease-out motion-reduce:transition-none',
          knobSizeClasses,
          modelValue ? translateClasses : 'translate-x-0.5',
        ]"
      />
    </button>
    <!-- A real <label for> forwards clicks to the switch button. -->
    <label
      v-if="label"
      :id="labelId"
      :for="switchId"
      :class="[
        'font-medium select-none',
        labelSizeClasses,
        disabled
          ? 'text-fg-muted cursor-not-allowed'
          : 'text-fg cursor-pointer',
      ]"
    >
      {{ label }}
    </label>
  </div>
</template>
