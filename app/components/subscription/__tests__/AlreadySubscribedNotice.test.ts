import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import AlreadySubscribedNotice from '../AlreadySubscribedNotice.vue';
import { useSubscriptionStore } from '~/stores/subscription';

vi.mock('~/stores/subscription', () => ({ useSubscriptionStore: vi.fn() }));

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};
const G = {
  mocks: { $t: (k: string) => k },
  stubs: { NuxtLink: NuxtLinkStub },
};

describe('AlreadySubscribedNotice', () => {
  beforeEach(() => setActivePinia(createPinia()));
  const mount = (isAlreadySubscribed: boolean) => {
    vi.mocked(useSubscriptionStore).mockReturnValue({
      isAlreadySubscribed,
    } as never);
    return mountSuspended(AlreadySubscribedNotice, { global: G });
  };

  it('renders nothing unless checkout was refused with 409', async () => {
    expect((await mount(false)).find('[role="alert"]').exists()).toBe(false);
  });

  it('announces the message and links to subscription settings', async () => {
    const alert = (await mount(true)).find('[role="alert"]');
    expect(alert.text()).toContain('subscription.alreadyActive');
    expect(alert.find('a').attributes('href')).toBe('/settings/subscription');
    expect(alert.find('a').text()).toBe('subscription.manageLink');
  });
});
