import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import AccountSetupWizard from '~/components/user/AccountSetupWizard.vue';

const redeemInviteCode = vi.hoisted(() => vi.fn());
const loadHouse = vi.hoisted(() => vi.fn());

mockNuxtImport('useUserApi', () => () => ({
  redeemInviteCode,
  uploadPicture: vi.fn(),
}));
mockNuxtImport('useHousesStore', () => () => ({ loadHouse }));
// OAuth user (has a name): the wizard starts at the invite-code step.
mockNuxtImport('useUserStore', () => () => ({
  currentUser: { first_name: 'Ada' },
}));
mockNuxtImport('useFeatureFlags', () => () => ({ isEnabled: () => false }));
mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const stubs = {
  UiWizard: {
    emits: ['finish'],
    template:
      '<div><slot :step="0" /><button id="finish" @click="$emit(\'finish\')" /></div>',
  },
  UiWizardStep: { template: '<div><slot /></div>' },
  UiOtpCodeInput: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'complete'],
    template:
      '<input id="otp" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'complete\')" />',
  },
};

const mount = () => mountSuspended(AccountSetupWizard, { global: { stubs } });

describe('AccountSetupWizard finish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redeemInviteCode.mockResolvedValue({ data: { house_id: 'house-9' } });
  });

  it('loads the joined house before closing, so the app shows it', async () => {
    let submittedBeforeLoad: unknown;
    // The submit closes the wizard: the house must already be in the store.
    loadHouse.mockImplementation(async () => {
      submittedBeforeLoad = wrapper.emitted('submit');
    });
    const wrapper = await mount();
    await wrapper.find('#otp').setValue('123456');
    await flushPromises();
    await wrapper.find('#finish').trigger('click');
    await flushPromises();

    expect(redeemInviteCode).toHaveBeenCalledTimes(1);
    expect(loadHouse).toHaveBeenCalledWith('house-9');
    expect(submittedBeforeLoad).toBeUndefined();
    expect(wrapper.emitted('submit')).toEqual([[{ is_first_access: false }]]);
  });

  it('does not touch the houses store when no code was redeemed', async () => {
    const wrapper = await mount();
    await wrapper.find('#finish').trigger('click');
    await flushPromises();

    expect(redeemInviteCode).not.toHaveBeenCalled();
    expect(loadHouse).not.toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('does not load a house when the code was rejected', async () => {
    redeemInviteCode.mockRejectedValue({ status: 410 });
    const wrapper = await mount();
    await wrapper.find('#otp').setValue('123456');
    await flushPromises();
    await wrapper.find('#finish').trigger('click');
    await flushPromises();

    expect(loadHouse).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('onboarding.invite.errors.codeUsed');
  });
});
