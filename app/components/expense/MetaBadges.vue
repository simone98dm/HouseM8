<script lang="ts" setup>
/**
 * ExpenseMetaBadges — category badges of one expense or bill.
 * Renders nothing when it has none.
 */
import type { ExpenseCategory } from '~~/shared/constants/categories';
import { CATEGORY_META } from '~/constants/categories';

interface ExpenseMetaBadgesProps {
  categories?: ExpenseCategory[];
}

const { categories = [] } = defineProps<ExpenseMetaBadgesProps>();

const { t: $t } = useI18n();
</script>

<template>
  <ul v-if="categories.length" class="flex flex-wrap items-center gap-1.5">
    <li v-for="key in categories" :key="key" class="badge badge-muted">
      {{ $t(CATEGORY_META[key].i18nKey) }}
    </li>
  </ul>
</template>
