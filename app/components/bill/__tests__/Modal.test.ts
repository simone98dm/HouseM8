import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Modal from '~/components/bill/Modal.vue';
import { UiModalFormStub } from '~/tests/utils';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiModal: UiModalFormStub,
    UiChip: true,
    ExpenseCategoryCombobox: true,
  },
};

const mockHouse = {
  id: 'h-1',
  name: 'My House',
  address: '1 Main St',
  owner_id: 'u-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  currency: 'EUR',
  member_count: 1,
  members: [],
  invitations: [],
  status: 'active' as const,
};

const mountModal = (currentHouse: typeof mockHouse | null = mockHouse) =>
  mountSuspended(Modal, { props: { show: true, currentHouse }, global: G });

const fill = async (
  wrapper: Awaited<ReturnType<typeof mountModal>>,
  { description = 'Internet Bill', cost = '49.99', due = '2099-12-01' } = {},
) => {
  const inputs = wrapper.findAll('input');
  await inputs[0]!.setValue(description);
  await inputs[1]!.setValue(cost);
  await inputs[2]!.setValue(due);
};

describe('Modal (Bill create)', () => {
  it('renders nothing when show is false', async () => {
    const wrapper = await mountSuspended(Modal, {
      props: { show: false, currentHouse: mockHouse },
      global: G,
    });
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('is a form whose submit button is never disabled for an empty form', async () => {
    const wrapper = await mountModal();
    const submit = wrapper.find('button[type="submit"]');
    expect(submit.exists()).toBe(true);
    expect(submit.attributes('disabled')).toBeUndefined();
  });

  it('emits close from the footer Cancel', async () => {
    const wrapper = await mountModal();
    const cancel = wrapper
      .findAll('footer button')
      .find((b) => b.text() === 'common.cancel');
    await cancel!.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows an inline error per missing field on submit instead of emitting', async () => {
    const wrapper = await mountModal();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeFalsy();
    const invalid = wrapper.findAll('[aria-invalid="true"]');
    expect(invalid).toHaveLength(3);
    expect(wrapper.text()).toContain('Add a description.');
    expect(wrapper.text()).toContain('Enter a cost above 0.');
    expect(wrapper.text()).toContain('Pick the next due date.');
  });

  it('rejects a zero cost', async () => {
    const wrapper = await mountModal();
    await fill(wrapper, { cost: '0' });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeFalsy();
    expect(wrapper.text()).toContain('Enter a cost above 0.');
  });

  it('does not emit without a house', async () => {
    const wrapper = await mountModal(null);
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('submits (Enter or button) with a trimmed payload', async () => {
    const wrapper = await mountModal();
    await fill(wrapper, { description: '  Internet Bill ' });
    await wrapper.find('form').trigger('submit');
    const payload = wrapper.emitted('submit')![0]![0] as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      description: 'Internet Bill',
      monthly_cost: 49.99,
      next_due_date: '2099-12-01',
      payment_period: 1,
      currency: 'EUR',
    });
  });

  it('keeps the input after submit and resets when closed', async () => {
    const wrapper = await mountModal();
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    const description = () =>
      (wrapper.findAll('input')[0]?.element as HTMLInputElement | undefined)
        ?.value;
    expect(description()).toBe('Internet Bill');
    await wrapper.setProps({ show: false });
    await wrapper.setProps({ show: true });
    expect(description()).toBe('');
  });
});
