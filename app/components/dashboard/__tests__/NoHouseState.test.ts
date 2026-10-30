import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import NoHouseState from '~/components/dashboard/NoHouseState.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiButton: true },
};

describe('NoHouseState', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(NoHouseState, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows noHouseFound title key', async () => {
    const wrapper = await mountSuspended(NoHouseState, { global: G });
    expect(wrapper.text()).toContain('home.noHouseFound');
  });

  it('shows createOrJoinHouse description key', async () => {
    const wrapper = await mountSuspended(NoHouseState, { global: G });
    expect(wrapper.text()).toContain('home.createOrJoinHouse');
  });

  it('emits create when the create UiButton is clicked', async () => {
    const wrapper = await mountSuspended(NoHouseState, { global: G });
    const buttons = wrapper.findAllComponents({ name: 'UiButton' });
    await buttons[0]!.trigger('click');
    expect(wrapper.emitted('create')).toBeTruthy();
  });

  const TOKEN = '123e4567-e89b-42d3-a456-426614174000';
  const G2 = { mocks: { $t: (k: string) => k }, stubs: { Icon: true } };

  it('emits join with the token pasted from a full invite URL', async () => {
    const wrapper = await mountSuspended(NoHouseState, { global: G2 });
    await wrapper
      .find('input')
      .setValue(`https://house-m8.app/house/join/${TOKEN}`);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('join')?.[0]).toEqual([TOKEN]);
  });

  it('shows an error and does not emit for an invalid link', async () => {
    const wrapper = await mountSuspended(NoHouseState, { global: G2 });
    await wrapper.find('input').setValue('nonsense');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('join')).toBeFalsy();
    expect(wrapper.text()).toContain('home.inviteInvalid');
  });
});
