<script lang="ts" setup>
const { t } = useI18n();

interface Props {
  disabled?: boolean;
  hasError?: boolean;
  /** Accessible name of the digit group; callers pass a context-specific one. */
  groupLabel?: string;
}

interface Events {
  complete: [value: string];
}

const {
  disabled = false,
  hasError = false,
  groupLabel = undefined,
} = defineProps<Props>();

const modelValue = defineModel<string>({ default: '' });

const emit = defineEmits<Events>();

const LENGTH = 6;
const inputs = ref<HTMLInputElement[]>([]);
// Sync internal digits from modelValue
const digits = ref<string[]>(
  Array.from({ length: LENGTH }, (_, i) => modelValue.value[i] ?? ''),
);

watch(
  () => modelValue.value,
  (val) => {
    const next = Array.from({ length: LENGTH }, (_, i) => val[i] ?? '');
    // Only update if externally driven (avoid re-render loop)
    if (next.join('') !== digits.value.join('')) {
      digits.value = next;
    }
  },
);

const focusIndex = (i: number) => {
  inputs.value[Math.max(0, Math.min(i, LENGTH - 1))]?.focus();
};

const emitChange = () => {
  const value = digits.value.join('');
  modelValue.value = value;
  if (value.length === LENGTH) {
    emit('complete', value);
  }
};

const onInput = (e: Event, index: number) => {
  const target = e.target as HTMLInputElement;
  const raw = target.value.replace(/\D/g, '');
  // Take only the last char typed (handles composing/replacement)
  const char = raw.slice(-1);
  digits.value[index] = char;
  emitChange();
  if (char && index < LENGTH - 1) focusIndex(index + 1);
};

const onKeydown = (e: KeyboardEvent, index: number) => {
  if (e.key === 'Backspace') {
    if (digits.value[index]) {
      digits.value[index] = '';
      emitChange();
    } else if (index > 0) {
      focusIndex(index - 1);
    }
  } else if (e.key === 'ArrowLeft' && index > 0) {
    e.preventDefault();
    focusIndex(index - 1);
  } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
    e.preventDefault();
    focusIndex(index + 1);
  }
};

const onPaste = (e: ClipboardEvent, startIndex: number) => {
  e.preventDefault();
  const pasted = (e.clipboardData?.getData('text') ?? '')
    .replace(/\D/g, '')
    .slice(0, LENGTH - startIndex);
  for (let i = 0; i < pasted.length; i++) {
    digits.value[startIndex + i] = pasted[i] ?? '';
  }
  emitChange();
  focusIndex(Math.min(startIndex + pasted.length, LENGTH - 1));
};

const onFocus = (e: FocusEvent) => {
  // Select existing digit on focus so user can overwrite easily
  (e.target as HTMLInputElement).select();
};
</script>

<template>
  <div
    class="otp-root"
    role="group"
    :aria-label="groupLabel ?? t('common.codeGroupLabel')"
  >
    <!-- Raw by design: 6 independently-focused per-digit inputs with custom
         keydown/paste/select handling — UiInput models one value, not an
         array of refs, so it can't own this. -->
    <input
      v-for="(digit, i) in digits"
      :key="i"
      :ref="
        (el) => {
          if (el) inputs[i] = el as HTMLInputElement;
        }
      "
      :value="digit"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      maxlength="1"
      :autocomplete="i === 0 ? 'one-time-code' : 'off'"
      :disabled="disabled"
      :aria-label="t('onboarding.invite.digitLabel', { n: i + 1 })"
      :aria-invalid="hasError"
      :class="[
        'otp-input',
        hasError && 'otp-input--error',
        disabled && 'otp-input--disabled',
      ]"
      @input="onInput($event, i)"
      @keydown="onKeydown($event, i)"
      @paste="onPaste($event, i)"
      @focus="onFocus"
    />
  </div>
</template>

<style scoped>
.otp-root {
  display: flex;
  gap: 8px;
  align-items: center;
}

.otp-input {
  width: 44px;
  height: 52px;
  border-radius: 10px;
  border: 1px solid var(--border-control);
  background: var(--surface);
  color: var(--fg);
  font-size: var(--fs-2xl);
  font-weight: 700;
  text-align: center;
  letter-spacing: 0;
  transition: border-color 0.15s;
  /* Remove browser spinners */
  -moz-appearance: textfield;
}
.otp-input::-webkit-outer-spin-button,
.otp-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
.otp-input:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
}
.otp-input--error {
  border-color: var(--danger);
}
.otp-input--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Group digits 3+3 */
.otp-input:nth-child(3) {
  margin-right: 8px;
}

@media (max-width: 400px) {
  .otp-input {
    width: 36px;
    height: 44px;
    font-size: var(--fs-xl);
  }
}
</style>
