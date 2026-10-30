import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import SpotCheck from '~/components/spot/Check.vue';
import SpotClipboard from '~/components/spot/Clipboard.vue';

describe.each([
  ['Check', SpotCheck],
  ['Clipboard', SpotClipboard],
])('Spot%s', (_n, C) => {
  it('is a decorative stroke-only svg', async () => {
    const w = await mountSuspended(C);
    const svg = w.find('svg');
    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(svg.attributes('stroke')).toBe('currentColor');
  });
});
