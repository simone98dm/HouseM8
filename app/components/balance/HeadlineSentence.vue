<script lang="ts" setup>
/**
 * BalanceHeadlineSentence — renders the money headline, with the named
 * housemate in their avatar hue and bold ("You owe **Marco** €47.00").
 * Inline content only: it sits inside the caller's sentence element.
 */
import type { MoneyHeadlinePart } from '~/composables/useMoneyHeadline';
import type { AvatarTone } from '~/utils/avatarTone';

interface BalanceHeadlineSentenceProps {
  parts: MoneyHeadlinePart[];
}

const { parts } = defineProps<BalanceHeadlineSentenceProps>();

// Orange and red hues read as warning/danger on a money sentence: those
// housemates stay bold but take the surrounding ink.
const DANGER_TONES: AvatarTone[] = ['d', 'e'];
const inkClass = (tone: AvatarTone) =>
  DANGER_TONES.includes(tone) ? '' : `avatar-ink-${tone}`;
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <span v-if="part.tone" :class="['font-bold', inkClass(part.tone)]">{{
      part.text
    }}</span>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
