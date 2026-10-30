<script setup lang="ts">
const { t } = useI18n();

// computed, not a plain const: t() must re-evaluate when the locale changes.
const faqs = computed(() => [
  {
    question: t('landing.faq.items.free.question'),
    answer: t('landing.faq.items.free.answer'),
  },
  {
    question: t('landing.faq.items.invite.question'),
    answer: t('landing.faq.items.invite.answer'),
  },
  {
    question: t('landing.faq.items.currencies.question'),
    answer: t('landing.faq.items.currencies.answer'),
  },
  {
    question: t('landing.faq.items.solo.question'),
    answer: t('landing.faq.items.solo.answer'),
  },
  {
    question: t('landing.faq.items.security.question'),
    answer: t('landing.faq.items.security.answer'),
  },
  {
    question: t('landing.faq.items.multipleHouses.question'),
    answer: t('landing.faq.items.multipleHouses.answer'),
  },
]);
</script>

<template>
  <section id="faq" class="bg-bg px-4 py-20 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <h2 class="text-balance text-3xl font-bold text-fg">
        {{ t('landing.faq.title') }}
      </h2>

      <div class="mt-8 divide-y divide-line border-y border-line">
        <details v-for="faq in faqs" :key="faq.question" class="group py-5">
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-fg [&::-webkit-details-marker]:hidden"
          >
            {{ faq.question }}
            <Icon
              name="heroicons:chevron-down"
              class="size-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p class="mt-4 max-w-prose text-fg-muted">{{ faq.answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
