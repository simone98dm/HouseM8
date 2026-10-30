import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import LegalLayout from '~/layouts/legal.vue';

const route = vi.hoisted(() => ({ path: '/privacy' }));
mockNuxtImport('useRoute', () => () => route);
mockNuxtImport('useI18n', async () => {
  const { ref } = await import('vue');
  const locale = ref('en');
  return () => ({ t: (k: string) => k, locale });
});

const G = {
  stubs: { PageHeader: true, PageFooter: true, Icon: true },
};
const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

const mount = (slotHtml: string) =>
  mountSuspended(LegalLayout, {
    slots: { default: () => h('div', { innerHTML: slotHtml }) },
    global: { ...G, stubs: { ...G.stubs, NuxtLink: NuxtLinkStub } },
    attachTo: document.body,
  });

describe('legal layout', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    route.path = '/privacy';
  });

  it('builds a TOC from h2s, assigning ids to headings without one and making them focusable', async () => {
    const wrapper = await mount('<h2 id="a">One</h2><h2> Two </h2>');
    await flushPromises();
    const links = wrapper.findAll('nav[aria-label="legal.toc.title"] a');
    expect(links.map((l) => l.attributes('href'))).toEqual([
      '#a',
      '#section-2',
    ]);
    expect(links.map((l) => l.text())).toEqual(['One', 'Two']);
    const h2s = wrapper.findAll('h2');
    expect(h2s[1]!.attributes('id')).toBe('section-2');
    expect(h2s[0]!.attributes('tabindex')).toBe('-1');
    wrapper.unmount();
  });

  it('omits the TOC when there is at most one heading', async () => {
    const wrapper = await mount('<h2>Only</h2>');
    await flushPromises();
    expect(wrapper.find('nav[aria-label="legal.toc.title"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });

  it('moves focus to the target heading when a TOC link is clicked', async () => {
    const wrapper = await mount('<h2 id="a">One</h2><h2 id="b">Two</h2>');
    await flushPromises();
    await wrapper
      .find('nav[aria-label="legal.toc.title"] a[href="#b"]')
      .trigger('click');
    await flushPromises();
    expect(document.activeElement?.id).toBe('b');
    wrapper.unmount();
  });

  it('ignores clicks on the TOC that are not hash links', async () => {
    const wrapper = await mount('<h2 id="a">One</h2><h2 id="b">Two</h2>');
    await flushPromises();
    const before = document.activeElement;
    await wrapper.find('nav[aria-label="legal.toc.title"] p').trigger('click');
    await flushPromises();
    expect(document.activeElement).toBe(before);
    wrapper.unmount();
  });

  it('exposes a focusable #main-content target and a skip link', async () => {
    const wrapper = await mountSuspended(LegalLayout);
    const main = wrapper.find('main');
    expect(main.attributes('id')).toBe('main-content');
    expect(main.attributes('tabindex')).toBe('-1');
    expect(wrapper.find('a[href="#main-content"]').exists()).toBe(true);
  });

  it('renders the legal nav with the four pages', async () => {
    const wrapper = await mount('<h2>x</h2>');
    const links = wrapper.findAll('nav[aria-label="legal.nav.label"] a');
    expect(links.map((l) => l.attributes('href'))).toEqual([
      '/privacy',
      '/terms',
      '/cookies',
      '/accessibility',
    ]);
    wrapper.unmount();
  });

  it('shows the draft banner as a labelled note', async () => {
    const wrapper = await mount('<h2>x</h2>');
    const note = wrapper.find('aside[role="note"]');
    expect(note.attributes('aria-labelledby')).toBe('legal-draft-title');
    expect(note.find('#legal-draft-title').text()).toBe(
      'legal.incompleteNotice.title',
    );
    wrapper.unmount();
  });
});
