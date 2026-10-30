import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Button from '~/components/ui/Button.vue';
import LinkButton from '~/components/ui/LinkButton.vue';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    NuxtLink: { template: '<a :class="$attrs.class"><slot /></a>' },
  },
};

const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

// Appearance classes only. UiButton adds `disabled:*` variants and
// UiLinkButton adds `opacity-60 cursor-not-allowed`, because <a> has no
// :disabled pseudo-class — that difference is intentional.
const appearance = (cls: string) =>
  cls
    .split(/\s+/)
    .filter(
      (c) =>
        c &&
        !c.startsWith('disabled:') &&
        c !== 'opacity-50' &&
        c !== 'cursor-not-allowed' &&
        c !== 'no-underline',
    )
    .sort();

/**
 * These two components carried independent copies of their styling and drifted:
 * LinkButton rendered rounded-xl against Button's rounded-full, a flat primary
 * against Button's gradient, and border-2 outlines against border. The same
 * button looked different depending on whether it happened to navigate.
 * Both now read from useButtonStyles; this fails if either forks again.
 */
describe('UiButton / UiLinkButton visual parity', () => {
  for (const variant of variants) {
    for (const outline of [false, true]) {
      it(`matches for ${variant}${outline ? ' outline' : ''}`, async () => {
        const btn = await mountSuspended(Button, {
          props: { variant, outline },
          global: G,
        });
        const link = await mountSuspended(LinkButton, {
          props: { variant, outline },
          global: G,
        });

        expect(appearance(link.find('a').attributes('class') ?? '')).toEqual(
          appearance(btn.find('button').attributes('class') ?? ''),
        );
      });
    }
  }

  for (const size of sizes) {
    it(`matches for size ${size}`, async () => {
      const btn = await mountSuspended(Button, { props: { size }, global: G });
      const link = await mountSuspended(LinkButton, {
        props: { size },
        global: G,
      });

      expect(appearance(link.find('a').attributes('class') ?? '')).toEqual(
        appearance(btn.find('button').attributes('class') ?? ''),
      );
    });
  }
});
