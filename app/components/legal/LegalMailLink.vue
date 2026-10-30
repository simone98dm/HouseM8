<script setup lang="ts">
import { isLegalEntityComplete } from '~/utils/legal/entity';

// Never render a dead mailbox: while the legal entity still holds TODO
// placeholders, show `fallback` as plain text instead. `lead` is the words
// that introduce the address ("write to"); they are dropped together with the
// link so each call site reads naturally in both states.
interface Props {
  email: string;
  lead?: string;
  fallback?: string;
}

const { email, lead = '', fallback = '' } = defineProps<Props>();
const { t } = useI18n();
const isReal = computed(
  () => isLegalEntityComplete() && !email.startsWith('TODO'),
);
</script>

<template>
  <template v-if="isReal"
    ><template v-if="lead">{{ lead }} </template
    ><a :href="`mailto:${email}`">{{ email }}</a></template
  >
  <span v-else>{{ fallback || t('legal.imprint.mailFallback') }}</span>
</template>
