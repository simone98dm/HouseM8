import { describe, it, expect, afterEach } from 'vitest';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import EditModal from '~/components/bill/EditModal.vue';

mockNuxtImport('useCurrency', () => () => ({
  getCurrencySymbol: () => '€',
  getSupportedCurrencies: () => [
    { value: 'EUR', label: 'Euro' },
    { value: 'USD', label: 'US Dollar' },
  ],
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiModal: {
      template: '<div v-if="show"><slot /><slot name="footer" /></div>',
      props: ['show'],
    },
    UiInput: {
      template: '<input />',
      props: [
        'id',
        'modelValue',
        'label',
        'placeholder',
        'type',
        'step',
        'min',
        'required',
      ],
    },
    UiButton: {
      template:
        '<button type="button" @click="$emit(\'click\')"><slot /></button>',
      props: ['type', 'variant', 'icon', 'loading', 'disabled', 'ariaLabel'],
      emits: ['click'],
    },
    UiChip: true,
    ExpenseCategoryCombobox: true,
    UiSelect: true,
    UiToggle: true,
  },
};

const mockBill = {
  id: 'b-1',
  house_id: 'h-1',
  description: 'Internet Bill',
  monthly_cost: 50,
  payment_period: 1,
  next_due_date: '2025-06-01',
  created_by: 'u-1',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  currency: 'EUR',
};

let wrapper: VueWrapper | undefined;

describe('EditModal (Bill edit)', () => {
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('renders nothing when show is false', async () => {
    wrapper = await mountSuspended(EditModal, {
      props: { show: false, bill: mockBill },
      global: G,
    });
    expect(wrapper!.find('input').exists()).toBe(false);
  });

  it('renders form when show is true', async () => {
    wrapper = await mountSuspended(EditModal, {
      props: { show: true, bill: mockBill },
      global: G,
    });
    expect(wrapper!.find('input').exists()).toBe(true);
  });

  it('emits close when cancel button is clicked', async () => {
    wrapper = await mountSuspended(EditModal, {
      props: { show: true, bill: mockBill },
      global: G,
    });
    await flushPromises();
    const cancel = wrapper!
      .findAll('button')
      .find((b) => b.text() === 'common.cancel');
    expect(cancel).toBeDefined();
    await cancel!.trigger('click');
    expect(wrapper!.emitted('close')).toHaveLength(1);
  });
});
