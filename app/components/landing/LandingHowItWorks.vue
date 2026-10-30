<script setup lang="ts">
const { t } = useI18n();

// computed, not a plain const: t() must re-evaluate when the locale changes.
const steps = computed(() => [
  {
    title: t('landing.howItWorks.steps.createHouse.title'),
    description: t('landing.howItWorks.steps.createHouse.description'),
  },
  {
    title: t('landing.howItWorks.steps.inviteRoommates.title'),
    description: t('landing.howItWorks.steps.inviteRoommates.description'),
  },
  {
    title: t('landing.howItWorks.steps.addExpenses.title'),
    description: t('landing.howItWorks.steps.addExpenses.description'),
  },
  {
    title: t('landing.howItWorks.steps.settleUp.title'),
    description: t('landing.howItWorks.steps.settleUp.description'),
  },
]);
</script>

<template>
  <section id="how-it-works" class="bg-surface px-4 py-20 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="max-w-2xl">
        <h2 class="text-balance text-3xl font-bold text-fg">
          {{ t('landing.howItWorks.title') }}
        </h2>
        <p class="mt-4 text-lg text-fg-muted">
          {{ t('landing.howItWorks.subtitle') }}
        </p>
      </div>

      <ol class="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="(step, index) in steps" :key="step.title">
          <!-- The <ol> already conveys the position to assistive tech. -->
          <span
            class="flex size-8 items-center justify-center rounded-full bg-brand-subtle text-sm font-bold text-brand-hover"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>
          <h3 class="mt-4 text-lg font-semibold text-fg">{{ step.title }}</h3>
          <p class="mt-2 text-fg-muted">{{ step.description }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
