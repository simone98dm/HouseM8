<script setup lang="ts">
// Copy is fully translated via landing.features.* (Phase 9). The card arrays are
// computed so t() re-evaluates on locale change.
const { t } = useI18n();

// computed, not a plain const: t() must re-evaluate when the locale changes.
const featureCards = computed(() => [
  {
    icon: 'heroicons:calculator',
    title: t('landing.features.cards.smartSplitting.title'),
    description: t('landing.features.cards.smartSplitting.description'),
  },
  {
    icon: 'heroicons:chart-pie',
    title: t('landing.features.cards.realTimeBalances.title'),
    description: t('landing.features.cards.realTimeBalances.description'),
  },
  {
    icon: 'heroicons:arrow-path',
    title: t('landing.features.cards.recurringBills.title'),
    description: t('landing.features.cards.recurringBills.description'),
  },
  {
    icon: 'heroicons:clipboard-document-list',
    title: t('landing.features.cards.bulletinBoard.title'),
    description: t('landing.features.cards.bulletinBoard.description'),
  },
]);

const issueCards = computed(() => [
  {
    icon: 'mdi:home-alert-outline',
    title: t('landing.features.issues.reporting.title'),
    description: t('landing.features.issues.reporting.description'),
  },
  {
    icon: 'heroicons:wrench-screwdriver',
    title: t('landing.features.issues.maintenance.title'),
    description: t('landing.features.issues.maintenance.description'),
  },
  {
    icon: 'heroicons:check-badge',
    title: t('landing.features.issues.resolution.title'),
    description: t('landing.features.issues.resolution.description'),
  },
]);

const problems = computed(() => [
  {
    title: t('landing.features.problem.maths.title'),
    description: t('landing.features.problem.maths.description'),
  },
  {
    title: t('landing.features.problem.groupChat.title'),
    description: t('landing.features.problem.groupChat.description'),
  },
  {
    title: t('landing.features.problem.latePayments.title'),
    description: t('landing.features.problem.latePayments.description'),
  },
]);
</script>

<template>
  <!-- The problem -->
  <section class="bg-bg px-4 py-20 sm:px-6 lg:px-8">
    <div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 class="text-balance text-3xl font-bold text-fg">
          {{ t('landing.features.problem.title') }}
        </h2>
        <p class="mt-4 text-lg text-fg-muted">
          {{ t('landing.features.problem.intro') }}
        </p>
      </div>

      <div>
        <ul class="divide-y divide-line border-y border-line" role="list">
          <li v-for="problem in problems" :key="problem.title" class="py-5">
            <h3 class="text-base font-semibold text-fg">
              {{ problem.title }}
            </h3>
            <p class="mt-1 text-fg-muted">{{ problem.description }}</p>
          </li>
        </ul>
        <p class="mt-6 font-semibold text-fg">
          {{ t('landing.features.problem.cta') }}
        </p>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="bg-surface px-4 py-20 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="max-w-2xl">
        <h2 class="text-balance text-3xl font-bold text-fg">
          {{ t('landing.features.title') }}
        </h2>
        <p class="mt-4 text-lg text-fg-muted">
          {{ t('landing.features.subtitle') }}
        </p>
      </div>

      <dl class="mt-12 border-b border-line">
        <div
          v-for="feature in featureCards"
          :key="feature.title"
          class="grid gap-x-10 gap-y-2 border-t border-line py-6 md:grid-cols-[18rem_1fr]"
        >
          <dt class="flex items-center gap-3 text-lg font-semibold text-fg">
            <Icon
              :name="feature.icon"
              class="size-5 shrink-0 text-brand"
              aria-hidden="true"
            />
            {{ feature.title }}
          </dt>
          <dd class="max-w-prose text-fg-muted">{{ feature.description }}</dd>
        </div>
      </dl>
    </div>
  </section>

  <!-- Owner contact -->
  <section class="bg-bg px-4 py-20 sm:px-6 lg:px-8">
    <div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
      <div>
        <h2 class="text-balance text-3xl font-bold text-fg">
          {{ t('landing.features.ownerContact.title') }}
        </h2>
        <p class="mt-4 max-w-prose text-lg text-fg-muted">
          {{ t('landing.features.ownerContact.description') }}
        </p>
      </div>

      <ul class="space-y-6" role="list">
        <li
          v-for="issue in issueCards"
          :key="issue.title"
          class="flex items-start gap-4"
        >
          <Icon
            :name="issue.icon"
            class="mt-1 size-5 shrink-0 text-brand"
            aria-hidden="true"
          />
          <div>
            <h3 class="text-base font-semibold text-fg">{{ issue.title }}</h3>
            <p class="mt-1 text-fg-muted">{{ issue.description }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
