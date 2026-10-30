<script lang="ts" setup>
interface BillEmptyStateProps {
  title: string;
  message: string;
  buttonText: string;
  showButton?: boolean;
}

const {
  title,
  message,
  buttonText,
  showButton = true,
} = defineProps<BillEmptyStateProps>();

interface BillEmptyStateEvents {
  'add-click': [];
}

const emit = defineEmits<BillEmptyStateEvents>();
</script>

<template>
  <UiEmptyState
    icon="heroicons:document-text"
    :title="title"
    :description="message"
  >
    <template v-if="showButton" #action>
      <UiButton @click="emit('add-click')">
        {{ buttonText }}
      </UiButton>
    </template>
  </UiEmptyState>
</template>
