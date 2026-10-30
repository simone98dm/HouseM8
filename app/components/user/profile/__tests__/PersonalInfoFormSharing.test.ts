import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import PersonalInfoForm from '~/components/user/profile/PersonalInfoForm.vue';
import { createMockUser } from '~/tests/utils';

const grantConsent = vi.hoisted(() => vi.fn());
vi.mock('~/composables/useConsents', () => ({
  useConsents: () => ({
    listConsents: vi.fn(),
    grantConsent,
    withdrawConsent: vi.fn(),
    acceptTerms: vi.fn(),
  }),
}));

const G = { stubs: { Icon: true } };
const mount = () =>
  mountSuspended(PersonalInfoForm, {
    props: { user: createMockUser({ gender: 'male', telephone: '123' }) },
    global: G,
  });

describe('PersonalInfoForm profile-sharing gate', () => {
  beforeEach(() => {
    grantConsent.mockReset();
    useConsentsStore().consents = [];
  });

  it('keeps name editable and locks optional fields behind an unticked opt-in', async () => {
    const wrapper = await mount();
    expect(wrapper.find('#first_name').exists()).toBe(true);
    expect(wrapper.find('#gender').exists()).toBe(false);
    const optIn = wrapper.find<HTMLInputElement>('#profile-sharing-optin');
    expect(optIn.element.checked).toBe(false);
  });

  it('does not send optional fields without consent', async () => {
    const wrapper = await mount();
    await wrapper.findAll('button').at(-1)!.trigger('click');
    const [payload] = wrapper.emitted('save')![0] as [Record<string, unknown>];
    expect(payload.gender).toBeUndefined();
    expect(payload.telephone).toBeUndefined();
    expect(payload.preferred_currency).toBe('EUR');
  });

  it('unlocks the fields after granting', async () => {
    grantConsent.mockResolvedValue({
      id: 'c',
      purpose: 'profile_sharing',
      version: 2,
      granted_at: '2026-10-26T00:00:00Z',
      withdrawn_at: null,
    });
    const wrapper = await mount();
    await wrapper.find('#profile-sharing-optin').setValue(true);
    await flushPromises();
    expect(grantConsent).toHaveBeenCalledWith('profile_sharing');
    expect(wrapper.find('#gender').exists()).toBe(true);
  });

  it('reverts the checkbox and shows an alert if granting fails', async () => {
    grantConsent.mockResolvedValue(null);
    const wrapper = await mount();
    await wrapper.find('#profile-sharing-optin').setValue(true);
    await flushPromises();
    expect(wrapper.find('#gender').exists()).toBe(false);
    expect(
      wrapper.find<HTMLInputElement>('#profile-sharing-optin').element.checked,
    ).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
});
