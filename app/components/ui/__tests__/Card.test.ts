import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UiCard from '~/components/ui/Card.vue';

const rootClass = (wrapper: { element: Element }) =>
  wrapper.element.getAttribute('class') ?? '';

describe('UiCard', () => {
  it('renders slot content', async () => {
    const wrapper = await mountSuspended(UiCard, {
      slots: { default: '<p>Body content</p>' },
    });
    expect(wrapper.text()).toContain('Body content');
  });

  it('is a hairline surface with the card radius and no hover effect', async () => {
    const wrapper = await mountSuspended(UiCard);
    const classes = rootClass(wrapper);
    expect(classes).toContain('rounded-card');
    expect(classes).toContain('border-line');
    expect(classes).toContain('bg-surface');
    expect(classes).not.toMatch(/shadow|hover:|transition-all|translate/);
  });

  it('renders the brand tone for the emphasised card', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { tone: 'brand' } });
    expect(rootClass(wrapper)).toContain('border-brand');
    expect(rootClass(wrapper)).toContain('bg-brand-subtle');
  });

  it('only interactive cards respond to hover and keyboard focus', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { interactive: true },
    });
    expect(rootClass(wrapper)).toContain('hover:shadow-sm');
    expect(rootClass(wrapper)).toContain('has-[:focus-visible]:outline-brand');
  });

  it.each([
    ['none', ''],
    ['sm', 'p-4'],
    ['normal', 'p-4 sm:p-5'],
    ['lg', 'p-5 sm:p-6'],
  ] as const)('applies %s padding to the body', async (padding, expected) => {
    const wrapper = await mountSuspended(UiCard, {
      props: { padding },
      slots: { default: '<p>x</p>' },
    });
    const body = wrapper.find('p').element.parentElement!;
    expect(body.className.trim()).toBe(`flex-1 space-y-4 ${expected}`.trim());
  });

  it('clips edge-to-edge content only when unpadded', async () => {
    const unpadded = await mountSuspended(UiCard, {
      props: { padding: 'none' },
    });
    const padded = await mountSuspended(UiCard);
    expect(rootClass(unpadded)).toContain('overflow-hidden');
    expect(rootClass(padded)).not.toContain('overflow-hidden');
  });

  it('renders the title as an h3 by default, above a hairline divider', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { title: 'Bills' } });
    const heading = wrapper.find('h3');
    expect(heading.text()).toBe('Bills');
    expect(heading.element.parentElement!.className).toContain('border-b');
  });

  it('honours headingLevel', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { title: 'Bills', headingLevel: 2 },
    });
    expect(wrapper.find('h2').text()).toBe('Bills');
    expect(wrapper.find('h3').exists()).toBe(false);
  });

  it('renders header actions next to the title', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { title: 'Bills' },
      slots: { actions: '<a href="/bills">View all</a>' },
    });
    expect(wrapper.find('a').text()).toBe('View all');
  });

  it('lets the header slot replace the title', async () => {
    const wrapper = await mountSuspended(UiCard, {
      slots: { header: '<h2>Custom header</h2>' },
    });
    expect(wrapper.text()).toContain('Custom header');
  });

  it('renders no header or footer wrappers without content', async () => {
    const wrapper = await mountSuspended(UiCard, {
      slots: { default: '<p>x</p>' },
    });
    expect(wrapper.element.children).toHaveLength(1);
  });

  it('renders footer slot', async () => {
    const wrapper = await mountSuspended(UiCard, {
      slots: { footer: '<span>Footer</span>' },
    });
    expect(wrapper.text()).toContain('Footer');
  });

  it('uses the requested root element', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { as: 'article' } });
    expect(wrapper.element.tagName).toBe('ARTICLE');
  });
});
