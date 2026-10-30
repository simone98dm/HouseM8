import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import HouseModal from '~/components/house/Modal.vue';
import { UiModalFormStub } from '~/tests/utils';
import { MAX_HOUSE_MEMBERS, MIN_HOUSE_MEMBERS } from '~/constants';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

mockNuxtImport('useCurrency', () => () => ({
  getSupportedCurrencies: () => [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
  ],
  DEFAULT_CURRENCY: 'EUR',
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiModal: UiModalFormStub },
};

const mountModal = () =>
  mountSuspended(HouseModal, { props: { show: true }, global: G });

describe('HouseModal', () => {
  it('renders nothing when show is false', async () => {
    const wrapper = await mountSuspended(HouseModal, {
      props: { show: false },
      global: G,
    });
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('renders the currency select through UiSelect', async () => {
    const wrapper = await mountModal();
    const options = wrapper.findAll('select option');
    expect(options.map((o) => o.attributes('value'))).toEqual(['EUR', 'USD']);
  });

  it('emits close from the footer Cancel', async () => {
    const wrapper = await mountModal();
    const cancel = wrapper
      .findAll('footer button')
      .find((b) => b.text() === 'common.cancel');
    await cancel!.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows an inline error instead of emitting when the name is empty', async () => {
    const wrapper = await mountModal();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeFalsy();
    expect(wrapper.text()).toContain('house.create.errors.name');
  });

  it('rejects a housemate count outside the allowed range', async () => {
    const wrapper = await mountModal();
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('Flat');
    await inputs[2]!.setValue(String(MAX_HOUSE_MEMBERS + 1));
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeFalsy();
    expect(wrapper.text()).toContain('house.create.errors.memberCount');
  });

  it('emits a trimmed payload with the address left out when empty', async () => {
    const wrapper = await mountModal();
    await wrapper.findAll('input')[0]!.setValue('  My Flat ');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')![0]![0]).toEqual({
      name: 'My Flat',
      address: undefined,
      currency: 'EUR',
      max_members: MIN_HOUSE_MEMBERS,
    });
  });

  it('includes the address when provided', async () => {
    const wrapper = await mountModal();
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('Flat');
    await inputs[1]!.setValue(' Via Roma 1 ');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({
      address: 'Via Roma 1',
    });
  });

  it('resets when closed', async () => {
    const wrapper = await mountModal();
    await wrapper.findAll('input')[0]!.setValue('Draft');
    await wrapper.setProps({ show: false });
    await wrapper.setProps({ show: true });
    expect(
      (wrapper.findAll('input')[0]!.element as HTMLInputElement).value,
    ).toBe('');
  });
});
