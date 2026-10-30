import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import MetaBadges from '~/components/expense/MetaBadges.vue';
import type { ExpenseCategory } from '~~/shared/constants/categories';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const mount = (categories?: ExpenseCategory[]) =>
  mountSuspended(MetaBadges, { props: { categories } });

describe('ExpenseMetaBadges', () => {
  it('renders nothing for an uncategorised expense', async () => {
    expect((await mount([])).find('ul').exists()).toBe(false);
    expect((await mount()).find('ul').exists()).toBe(false);
  });

  it('lists every category as a translated badge', async () => {
    const wrapper = await mount(['subscriptions', 'entertainment']);
    const badges = wrapper.findAll('li').map((li) => li.text());
    expect(badges).toEqual([
      'categories.subscriptions',
      'categories.entertainment',
    ]);
  });
});
