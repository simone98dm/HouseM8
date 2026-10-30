import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import ExpenseFilterBar from '~/components/expense/FilterBar.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

describe('ExpenseFilterBar', () => {
  it('is one labelled group of toggle buttons with a single pressed filter', async () => {
    const wrapper = await mountSuspended(ExpenseFilterBar, {
      props: { currentFilter: 'pending' },
    });

    const group = wrapper.find('[role="group"]');
    expect(group.attributes('aria-label')).toBe('expenses.filterTitle');
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);

    const pressed = wrapper
      .findAll('button')
      .map((b) => [b.text(), b.attributes('aria-pressed')]);
    expect(pressed).toEqual([
      ['expenses.filter.all', 'false'],
      ['expenses.filter.pending', 'true'],
      ['expenses.filter.settled', 'false'],
    ]);
  });

  it('emits filter-change when a filter is clicked', async () => {
    const wrapper = await mountSuspended(ExpenseFilterBar, {
      props: { currentFilter: 'all' },
    });

    await wrapper.findAll('button')[2]!.trigger('click');

    expect(wrapper.emitted('filter-change')).toEqual([['settled']]);
  });

  it('emits search-change from the search input', async () => {
    const wrapper = await mountSuspended(ExpenseFilterBar, {
      props: { currentFilter: 'all' },
    });

    await wrapper.find('input[type="search"]').setValue('rent');

    expect(wrapper.emitted('search-change')).toEqual([['rent']]);
  });
});
