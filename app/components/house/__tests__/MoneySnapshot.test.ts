import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import MoneySnapshot from '~/components/house/MoneySnapshot.vue';

describe('HouseMoneySnapshot', () => {
  it('keeps every link inside a dd so the dl stays valid', async () => {
    const wrapper = await mountSuspended(MoneySnapshot, {
      props: { currency: 'EUR', monthTotal: 12, balance: -5 },
    });
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.element.closest('dd')).not.toBeNull();
    }
    expect(wrapper.element.querySelectorAll('dl > div > a')).toHaveLength(0);
  });
});
