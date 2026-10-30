import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import FilterBar from '~/components/report/FilterBar.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = { mocks: { $t: (k: string) => k } };

const baseCounts = { all: 10, not_read: 3, read: 4, solved: 3 };

describe('ReportFilterBar', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(FilterBar, {
      props: { modelValue: undefined, counts: baseCounts },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows all filter i18n key', async () => {
    const wrapper = await mountSuspended(FilterBar, {
      props: { modelValue: undefined, counts: baseCounts },
      global: G,
    });
    expect(wrapper.text()).toContain('reports.filters.all');
  });

  it('shows pending filter i18n key', async () => {
    const wrapper = await mountSuspended(FilterBar, {
      props: { modelValue: undefined, counts: baseCounts },
      global: G,
    });
    expect(wrapper.text()).toContain('reports.filters.pending');
  });

  it('shows count totals', async () => {
    const wrapper = await mountSuspended(FilterBar, {
      props: { modelValue: undefined, counts: baseCounts },
      global: G,
    });
    expect(wrapper.text()).toContain('10');
    expect(wrapper.text()).toContain('3');
  });

  it('emits update:modelValue when a tab is clicked', async () => {
    const wrapper = await mountSuspended(FilterBar, {
      props: { modelValue: undefined, counts: baseCounts },
      global: G,
    });
    const buttons = wrapper.findAll('button');
    await buttons[1]!.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });
});
