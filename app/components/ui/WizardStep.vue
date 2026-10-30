<script setup lang="ts">
interface WizardStepProps {
  stepIndex: number;
  isValid: boolean;
}

const { stepIndex, isValid } = defineProps<WizardStepProps>();

const wizardStep = inject<any>('wizardStep');

watchEffect(() => {
  if (wizardStep && typeof wizardStep.setStepValid === 'function') {
    wizardStep.setStepValid(stepIndex, isValid);
  }
});
</script>

<template>
  <div>
    <slot />
  </div>
</template>
