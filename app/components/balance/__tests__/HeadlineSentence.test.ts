import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import HeadlineSentence from '~/components/balance/HeadlineSentence.vue';

const mountParts = (tone: 'a' | 'b' | 'c' | 'd' | 'e') =>
  mountSuspended(HeadlineSentence, {
    props: {
      parts: [{ text: 'You owe ' }, { text: 'Marco', tone }, { text: ' 5' }],
    },
  });

describe('HeadlineSentence', () => {
  it.each(['a', 'b', 'c'] as const)('inks the name in tone %s', async (t) => {
    const w = await mountParts(t);
    expect(w.find('span').classes()).toContain(`avatar-ink-${t}`);
  });

  it.each(['d', 'e'] as const)(
    'never inks the name in the orange/red tone %s',
    async (t) => {
      const w = await mountParts(t);
      const span = w.find('span');
      expect(span.classes()).toContain('font-bold');
      expect(span.classes().join(' ')).not.toContain('avatar-ink');
    },
  );
});
