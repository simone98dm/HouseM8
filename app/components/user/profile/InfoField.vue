<script setup lang="ts">
interface Props {
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  label: string;
  value?: string;
  valueClass?: string;
}

const {
  icon,
  iconBgClass,
  iconColorClass,
  label,
  value = '',
  valueClass = '',
} = defineProps<Props>();
</script>

<template>
  <div class="flex items-start gap-3">
    <div
      class="flex size-10 items-center justify-center rounded-lg shrink-0"
      :class="iconBgClass"
    >
      <Icon
        :name="icon"
        class="h-5 w-5"
        :class="iconColorClass"
        aria-hidden="true"
      />
    </div>
    <div class="flex-1">
      <p class="text-xs font-medium text-fg-muted">
        {{ label }}
      </p>
      <slot>
        <p class="text-sm font-semibold text-fg" :class="valueClass">
          {{ value }}
        </p>
      </slot>
    </div>
  </div>
</template>
