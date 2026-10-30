<script setup lang="ts">
// Calm: no celebration. Two avatars and a check; the headline above already
// says "You're all settled up".
interface Person {
  id: string;
  first_name: string;
  last_name: string;
}

interface AllSettledStateProps {
  /** The viewer, when known. */
  me?: Person | null;
  /** Everyone else in the house. */
  others?: Person[];
}

const { me = null, others = [] } = defineProps<AllSettledStateProps>();

const [first] = others;
</script>

<template>
  <div class="flex flex-col items-center py-12 text-center">
    <div v-if="me && first" class="flex items-center gap-2">
      <UiUserAvatar :user="me as never" size="lg" />
      <SpotCheck />
      <UiUserAvatar :user="first as never" size="lg" />
    </div>
    <SpotCheck v-else />
    <p class="mt-3 max-w-xs text-sm text-fg">
      {{
        others.length === 1 && first
          ? $t('balance.squareWith', { name: first.first_name })
          : $t('balance.squareAll')
      }}
    </p>
    <p class="mt-1 max-w-xs text-sm text-fg-muted">
      {{ $t('balance.allSettledDesc') }}
    </p>
  </div>
</template>
