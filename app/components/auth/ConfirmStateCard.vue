<script lang="ts" setup>
// Shared "icon + state content" wrapper for confirm.vue's four mutually
// exclusive states (pending/success/expired/error). Extracted because the
// same structure repeated four times inside one file — see
// nuxt4-vue3-refactoring skill, 4.1.C (duplication).
//
// Heading/body/actions stay as default-slot content authored directly by
// confirm.vue (not rendered by this component) so `.auth-heading` remains a
// single hop away from AuthShell's `:deep()` rules, same as login/register.
interface Props {
  variant: 'pending' | 'success' | 'danger';
}

const { variant } = defineProps<Props>();
</script>

<template>
  <div class="confirm-state">
    <div class="confirm-icon-wrap" :class="variant" aria-hidden="true">
      <slot name="icon" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.confirm-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
}

.confirm-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.confirm-icon-wrap.pending {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}
.confirm-icon-wrap.success {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}
.confirm-icon-wrap.danger {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}
</style>
