import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AccountPanel from '~/components/user/AccountPanel.vue';
import { createMockHouse } from '~/tests/utils';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiLanguageSwitcher: true, UiSelect: true },
};

describe('AccountPanel', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(AccountPanel, {
      props: { currentHouse: createMockHouse(), loading: false },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the no-house state when there is no current house and loading is done', async () => {
    const wrapper = await mountSuspended(AccountPanel, {
      props: { currentHouse: null, loading: false },
      global: G,
    });
    expect(wrapper.text()).toContain('profile.noHouse.title');
  });

  it('hides the no-house state while still loading', async () => {
    const wrapper = await mountSuspended(AccountPanel, {
      props: { currentHouse: null, loading: true },
      global: G,
    });
    expect(wrapper.text()).not.toContain('profile.noHouse.title');
  });

  it('hides the no-house state when a current house exists', async () => {
    const wrapper = await mountSuspended(AccountPanel, {
      props: { currentHouse: createMockHouse(), loading: false },
      global: G,
    });
    expect(wrapper.text()).not.toContain('profile.noHouse.title');
  });

  it('emits sign-out when the sign out button is clicked', async () => {
    const wrapper = await mountSuspended(AccountPanel, {
      props: { currentHouse: createMockHouse(), loading: false },
      global: G,
    });
    const signOutButton = wrapper
      .findAllComponents({ name: 'UiButton' })
      .find((b) => b.text().includes('auth.signOut'));
    await signOutButton?.trigger('click');
    expect(wrapper.emitted('sign-out')).toBeTruthy();
  });
});
