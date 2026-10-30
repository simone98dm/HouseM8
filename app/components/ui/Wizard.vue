<script setup lang="ts">
const { t } = useI18n();

interface Emits {
  finish: [];
  'step-change': [stepIndex: number];
}

const { steps } = defineProps<{
  steps: string[];
}>();

const emit = defineEmits<Emits>();

const currentStep = ref(0);
const stepValidity = ref<boolean[]>(steps.map(() => false));

const goNext = () => {
  if (
    currentStep.value < steps.length - 1 &&
    stepValidity.value[currentStep.value]
  ) {
    currentStep.value++;
  } else if (
    currentStep.value === steps.length - 1 &&
    stepValidity.value[currentStep.value]
  ) {
    emit('finish');
  }
};

const goBack = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const setStepValid = (index: number, valid: boolean) => {
  stepValidity.value[index] = valid;
};

provide('wizardStep', {
  currentStep,
  setStepValid,
});

// Single source of `step-change`. goNext()/goBack() previously emitted here AND
// mutated currentStep, so this watcher fired too and every transition emitted
// twice with the same value. Do not re-add an emit alongside the mutation.
watch(currentStep, (val) => {
  emit('step-change', val);
});
</script>

<template>
  <div class="wizard">
    <div class="flex items-center justify-center mb-6 gap-0">
      <template v-for="(step, idx) in steps" :key="step">
        <div class="flex items-center">
          <div
            class="w-4 h-4 rounded-full border-2 border-brand transition-colors duration-150"
            :class="idx === currentStep ? 'bg-brand' : 'bg-surface'"
          ></div>
          <div
            v-if="idx < steps.length - 1"
            class="w-8 h-1 mx-2 transition-colors duration-150"
            :class="idx < currentStep ? 'bg-brand' : 'bg-line'"
          ></div>
        </div>
      </template>
    </div>
    <div>
      <slot :step="currentStep" />
    </div>
    <div class="flex justify-between mt-8 gap-3">
      <UiButton
        type="button"
        variant="secondary"
        class="flex-1"
        :disabled="currentStep === 0"
        @click="goBack"
      >
        {{ t('common.back') }}
      </UiButton>
      <UiButton
        type="button"
        variant="primary"
        class="flex-1"
        :disabled="!stepValidity[currentStep]"
        @click="goNext"
      >
        {{
          currentStep === steps.length - 1
            ? t('wizard.finish')
            : t('wizard.next')
        }}
      </UiButton>
    </div>
  </div>
</template>
