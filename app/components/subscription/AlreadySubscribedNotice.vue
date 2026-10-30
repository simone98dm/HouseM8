<script setup lang="ts">
const subscriptionStore = useSubscriptionStore();
</script>

<template>
  <div
    v-if="subscriptionStore.isAlreadySubscribed"
    role="alert"
    class="state-card state-card--error flex-wrap items-center justify-between gap-3 text-left text-sm"
  >
    <p>{{ $t('subscription.alreadyActive') }}</p>
    <NuxtLink
      to="/settings/subscription"
      class="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {{ $t('subscription.manageLink') }}
    </NuxtLink>
  </div>
</template>
