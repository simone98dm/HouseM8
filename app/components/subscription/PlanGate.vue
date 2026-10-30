<script setup lang="ts">
interface Props {
  requiredPlan: 'pro' | 'house_plus';
}
const { requiredPlan } = defineProps<Props>();

const subscriptionStore = useSubscriptionStore();
const showPaywall = ref(false);

const hasAccess = computed(() => {
  if (requiredPlan === 'pro') return subscriptionStore.isPro;
  return subscriptionStore.isHousePlus;
});
</script>

<template>
  <div>
    <slot v-if="hasAccess" />
    <div v-else @click="showPaywall = true">
      <slot name="locked">
        <div class="relative cursor-pointer select-none">
          <div class="pointer-events-none opacity-40">
            <slot />
          </div>
          <div
            class="absolute inset-0 flex items-center justify-center rounded-lg bg-surface/80"
          >
            <div class="flex flex-col items-center gap-2 text-center">
              <Icon
                name="heroicons:lock-closed"
                class="size-6 text-fg-muted"
                aria-hidden="true"
              />
              <span class="text-sm font-semibold text-fg">
                {{
                  $t('subscription.requiresPlan', {
                    plan: requiredPlan === 'pro' ? 'Pro' : 'House+',
                  })
                }}
              </span>
              <!-- No click handler of its own: the wrapping div's click
                   opens the paywall, by design. -->
              <UiButton type="button" size="sm" class="mt-1">
                {{ $t('subscription.upgrade') }}
              </UiButton>
            </div>
          </div>
        </div>
      </slot>
    </div>
    <!-- No `v-if` alongside `:show` — see the note in pages/expenses/index.vue:
         an outer v-if skips both the enter and leave animations. -->
    <SubscriptionPaywallModal
      :show="showPaywall"
      :required-plan="requiredPlan"
      @close="showPaywall = false"
    />
  </div>
</template>
