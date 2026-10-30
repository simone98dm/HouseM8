<script lang="ts" setup>
// Shared "email sent" success state (register, forgot-password). Mounted when
// the form swaps out, so the heading takes focus on mount: keyboard and
// screen-reader users are not dropped on <body>.
interface Props {
  title: string;
}

const { title } = defineProps<Props>();

const heading = ref<HTMLElement | null>(null);

onMounted(() => nextTick(() => heading.value?.focus()));
</script>

<template>
  <div class="auth-success-state">
    <div class="auth-success-icon" aria-hidden="true">
      <AuthIconEmail :size="28" />
    </div>
    <h1 ref="heading" tabindex="-1" class="auth-heading text-center">
      {{ title }}
    </h1>
    <p class="auth-sub text-center"><slot /></p>
    <p v-if="$slots.note" class="auth-success-note">
      <slot name="note" />
    </p>
    <div v-if="$slots.actions" class="auth-success-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.auth-success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.auth-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--success-subtle);
  color: var(--success-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.auth-success-note {
  margin: -12px 0 20px;
  text-align: center;
  font-size: var(--fs-base);
  color: var(--fg-muted);
}

.auth-success-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
</style>
