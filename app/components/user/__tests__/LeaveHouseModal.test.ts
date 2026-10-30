import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import LeaveHouseModal from '~/components/user/LeaveHouseModal.vue';

const { housesMock } = vi.hoisted(() => ({
  housesMock: {
    getUserBalanceInHouse: vi.fn(),
    getHouseMembers: vi.fn(),
    leaveHouse: vi.fn(),
  },
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));
mockNuxtImport('useHouses', () => () => housesMock);
mockNuxtImport('useUserStore', () => () => ({ currentUser: { id: 'u-1' } }));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    UiModal: {
      template: '<div class="ui-modal"><slot /><slot name="footer" /></div>',
      props: ['show', 'title'],
    },
    UiButton: {
      template:
        '<button class="ui-btn" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
      props: ['variant', 'disabled', 'loading'],
      emits: ['click'],
    },
    UiUserAvatar: { template: '<div />', props: ['size', 'user'] },
    Icon: true,
  },
};

const member = (id: string, role = 'member') => ({
  user_id: id,
  role,
  left_at: null,
  user: { id, first_name: id, last_name: 'X' },
});

const mount = async (isOwner: boolean) => {
  const wrapper = await mountSuspended(LeaveHouseModal, {
    props: { houseId: 'h-1', houseName: 'Casa', isOwner },
    global: G,
  });
  await flushPromises();
  return wrapper;
};

const leaveButton = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.findAll('.ui-btn').at(-1)!;

describe('LeaveHouseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    housesMock.getUserBalanceInHouse.mockResolvedValue({
      data: { net_balance: 0 },
      error: null,
    });
    housesMock.getHouseMembers.mockResolvedValue({
      data: [member('u-1', 'owner'), member('u-2'), member('u-3')],
      error: null,
    });
    housesMock.leaveHouse.mockResolvedValue({ data: null, error: null });
  });

  it('lets a non-owner leave without choosing a successor', async () => {
    const wrapper = await mount(false);

    await leaveButton(wrapper).trigger('click');

    expect(housesMock.getHouseMembers).not.toHaveBeenCalled();
    expect(housesMock.leaveHouse).toHaveBeenCalledWith('h-1', undefined);
    expect(wrapper.emitted('left')).toBeTruthy();
  });

  it('lists the other members as owner candidates and keeps leave disabled until one is picked', async () => {
    const wrapper = await mount(true);

    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios.map((r) => r.attributes('value'))).toEqual(['u-2', 'u-3']);
    expect(leaveButton(wrapper).text()).toBe('house.leave.transferAndLeave');
    expect(leaveButton(wrapper).attributes('disabled')).toBeDefined();
  });

  it('transfers ownership to the selected member and leaves', async () => {
    const wrapper = await mount(true);

    await wrapper.find('input[value="u-3"]').setValue();
    expect(leaveButton(wrapper).attributes('disabled')).toBeUndefined();
    await leaveButton(wrapper).trigger('click');
    await flushPromises();

    expect(housesMock.leaveHouse).toHaveBeenCalledWith('h-1', 'u-3');
    expect(wrapper.emitted('left')).toBeTruthy();
  });

  it('tells a sole owner to archive instead, with no way to leave', async () => {
    housesMock.getHouseMembers.mockResolvedValue({
      data: [member('u-1', 'owner')],
      error: null,
    });
    const wrapper = await mount(true);

    expect(wrapper.text()).toContain('house.leave.soleOwnerWarning');
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false);
    expect(leaveButton(wrapper).text()).toBe('house.leave.transferFirst');
    await leaveButton(wrapper).trigger('click');
    expect(housesMock.leaveHouse).not.toHaveBeenCalled();
  });

  it('shows the server error and stays open when leaving fails', async () => {
    housesMock.leaveHouse.mockResolvedValue({ data: null, error: 'Boom' });
    const wrapper = await mount(true);

    await wrapper.find('input[value="u-2"]').setValue();
    await leaveButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Boom');
    expect(wrapper.emitted('left')).toBeFalsy();
  });
});
