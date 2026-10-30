import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AllSettledState from '~/components/balance/AllSettledState.vue';

const G = { mocks: { $t: (k: string) => k }, stubs: { Icon: true } };

describe('AllSettledState', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(AllSettledState, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('does not celebrate (no bounce animation)', async () => {
    const wrapper = await mountSuspended(AllSettledState, { global: G });
    expect(wrapper.html()).not.toContain('bounce');
  });

  it('shows allSettledDesc description', async () => {
    const wrapper = await mountSuspended(AllSettledState, { global: G });
    expect(wrapper.text()).toContain('balance.allSettledDesc');
  });

  const me = { id: 'u-1', first_name: 'Me', last_name: 'X' };
  const silvia = { id: 'u-2', first_name: 'Silvia', last_name: 'Y' };
  const params = (k: string, p?: { name: string }) => `${k}:${p?.name ?? ''}`;

  it('names the person when there is one, with two avatars', async () => {
    const wrapper = await mountSuspended(AllSettledState, {
      props: { me, others: [silvia] },
      global: { ...G, mocks: { $t: params } },
    });
    expect(wrapper.text()).toContain('balance.squareWith:Silvia');
    expect(wrapper.findAll('img').length).toBe(2);
  });

  it('stays generic when there are several people', async () => {
    const wrapper = await mountSuspended(AllSettledState, {
      props: { me, others: [silvia, { ...silvia, id: 'u-3' }] },
      global: { ...G, mocks: { $t: params } },
    });
    expect(wrapper.text()).toContain('balance.squareAll');
    expect(wrapper.text()).not.toContain('Silvia');
  });
});
