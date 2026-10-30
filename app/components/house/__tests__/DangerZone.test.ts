import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import DangerZone from '~/components/house/DangerZone.vue';
import MoneySnapshot from '~/components/house/MoneySnapshot.vue';

const stubs = { global: { stubs: { Icon: true } } };

describe('HouseDangerZone', () => {
  it('offers Leave to members', async () => {
    const w = await mountSuspended(DangerZone, { props: {}, ...stubs });
    await w.find('button').trigger('click');
    expect(w.emitted('leave')).toHaveLength(1);
  });

  it('offers Archive (not Leave) to the owner', async () => {
    const w = await mountSuspended(DangerZone, {
      props: { isOwner: true },
      ...stubs,
    });
    expect(w.text()).not.toContain('Leave house');
    await w.find('button').trigger('click');
    expect(w.emitted('archive')).toHaveLength(1);
  });
});

describe('HouseMoneySnapshot', () => {
  it('links to expenses and balance and words the balance', async () => {
    const w = await mountSuspended(MoneySnapshot, {
      props: { currency: 'EUR', monthTotal: 12.5, balance: -3 },
      ...stubs,
    });
    expect(w.find('a[href="/expenses"]').exists()).toBe(true);
    expect(w.find('a[href="/balance"]').exists()).toBe(true);
    expect(w.text()).toContain('You owe');
  });

  it('says square within a cent and unavailable when unknown', async () => {
    const square = await mountSuspended(MoneySnapshot, {
      props: { currency: 'EUR', balance: 0 },
      ...stubs,
    });
    expect(square.text()).toContain("You're square");
    const unknown = await mountSuspended(MoneySnapshot, {
      props: { currency: 'EUR' },
      ...stubs,
    });
    expect(unknown.text()).toContain('Balance unavailable');
  });
});
