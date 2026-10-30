<script setup lang="ts">
interface Props {
  label: string;
  placeholder?: string;
  addButtonText?: string;
  /** Accessible name of the add button; defaults to a generic one. */
  addLabel?: string;
}

const { t } = useI18n();

const {
  label,
  placeholder = '',
  addButtonText,
  addLabel = undefined,
} = defineProps<Props>();

const modelValue = defineModel<string[]>({ required: true });

const inputValue = ref('');

// Computed property for button text with i18n fallback
const buttonText = computed(() => addButtonText || t('common.addItem'));

const addItem = () => {
  const value = inputValue.value.trim();
  if (value && !modelValue.value.includes(value)) {
    modelValue.value = [...modelValue.value, value];
    inputValue.value = '';
  }
};

const removeItem = (index: number) => {
  modelValue.value = modelValue.value.filter((_, i) => i !== index);
};
</script>

<template>
  <div class="space-y-3">
    <!-- items-end, not the default stretch: UiInput renders a label above its
         field, so a stretched button spans label + field and sits taller than
         the control it belongs to. Bottom-aligning puts it on the field's own
         row. size="md" matches UiInput's md metrics exactly (py-2.5 text-sm),
         so the two are the same height rather than merely aligned. -->
    <div class="flex items-end gap-2">
      <UiInput
        v-model="inputValue"
        :label="label"
        :placeholder="placeholder"
        class="flex-1"
        @keydown.enter.prevent="addItem"
      />
      <UiButton
        type="button"
        variant="secondary"
        size="md"
        class="shrink-0"
        :aria-label="addLabel ?? $t('common.addItem')"
        @click="addItem"
      >
        {{ buttonText }}
      </UiButton>
    </div>

    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <UiChip
        v-for="(item, index) in modelValue"
        :key="`${index}-${item}`"
        :label="item"
        removable
        variant="primary"
        @remove="removeItem(index)"
      />
    </div>
  </div>
</template>
