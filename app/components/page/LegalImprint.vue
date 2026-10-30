<script setup lang="ts">
import { LEGAL_ENTITY, isLegalEntityComplete } from '~/utils/legal/entity';

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <section
    v-if="isLegalEntityComplete()"
    :aria-labelledby="headingId"
    class="text-sm leading-relaxed text-fg-muted"
  >
    <h2 :id="headingId" class="mb-1 text-sm font-semibold text-fg">
      {{ t('legal.imprint.title') }}
    </h2>
    <address class="not-italic">
      <p>
        {{ LEGAL_ENTITY.name }} ({{ LEGAL_ENTITY.legalForm }}) ·
        {{ LEGAL_ENTITY.address }}
      </p>
      <p>
        {{ t('legal.imprint.vat') }}: {{ LEGAL_ENTITY.vatNumber }} ·
        {{ t('legal.imprint.rea') }}: {{ LEGAL_ENTITY.rea }} ·
        {{ t('legal.imprint.pec') }}: {{ LEGAL_ENTITY.pec }}
      </p>
      <p>
        {{ t('legal.imprint.contact') }}:
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          class="underline hover:text-fg"
        />
      </p>
    </address>
  </section>
</template>
