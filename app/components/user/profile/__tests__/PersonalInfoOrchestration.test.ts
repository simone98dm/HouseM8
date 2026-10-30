/**
 * Tests the PersonalInfo orchestrator: edit-mode toggling and save/cancel
 * delegation to its child components (Pictures / Form / View), after the
 * Phase 7 Smart/Dumb split. See PersonalInfoView.test.ts,
 * PersonalInfoPictures.test.ts and PersonalInfoForm.test.ts for the
 * extracted children's own behavior.
 */
import { describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import PersonalInfo from '~/components/user/profile/PersonalInfo.vue';
import { createMockUser } from '~/tests/utils';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UserProfilePersonalInfoPictures: true,
    UserProfilePersonalInfoForm: true,
    UserProfilePersonalInfoView: true,
  },
};

describe('PersonalInfo', () => {
  it('starts in view mode', async () => {
    const wrapper = await mountSuspended(PersonalInfo, {
      props: { user: createMockUser(), save: vi.fn() },
      global: G,
    });
    expect(
      wrapper.findComponent({ name: 'UserProfilePersonalInfoView' }).exists(),
    ).toBe(true);
    expect(
      wrapper.findComponent({ name: 'UserProfilePersonalInfoForm' }).exists(),
    ).toBe(false);
  });

  it('shows the edit button only for the own profile while in view mode', async () => {
    const wrapper = await mountSuspended(PersonalInfo, {
      props: { user: createMockUser(), isOwnProfile: true, save: vi.fn() },
      global: G,
    });
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(true);
  });

  it('hides the edit button when not the own profile', async () => {
    const wrapper = await mountSuspended(PersonalInfo, {
      props: { user: createMockUser(), isOwnProfile: false, save: vi.fn() },
      global: G,
    });
    expect(wrapper.findComponent({ name: 'UiButton' }).exists()).toBe(false);
  });

  it('switches to the form when the edit button is clicked', async () => {
    const wrapper = await mountSuspended(PersonalInfo, {
      props: { user: createMockUser(), isOwnProfile: true, save: vi.fn() },
      global: G,
    });
    await wrapper.findComponent({ name: 'UiButton' }).trigger('click');
    expect(
      wrapper.findComponent({ name: 'UserProfilePersonalInfoForm' }).exists(),
    ).toBe(true);
    expect(
      wrapper.findComponent({ name: 'UserProfilePersonalInfoView' }).exists(),
    ).toBe(false);
  });

  const saveWith = async (result: boolean) => {
    const save = vi.fn().mockResolvedValue(result);
    const wrapper = await mountSuspended(PersonalInfo, {
      props: { user: createMockUser(), isOwnProfile: true, save },
      global: G,
    });
    await wrapper.findComponent({ name: 'UiButton' }).trigger('click');
    wrapper
      .findComponent({ name: 'UserProfilePersonalInfoForm' })
      .vm.$emit('save', { first_name: 'Jane' });
    await flushPromises();
    return { wrapper, save };
  };

  it('saves and returns to view mode when the save succeeds', async () => {
    const { wrapper, save } = await saveWith(true);
    expect(save).toHaveBeenCalledWith({ first_name: 'Jane' });
    expect(
      wrapper.findComponent({ name: 'UserProfilePersonalInfoView' }).exists(),
    ).toBe(true);
  });

  it('keeps the form open with an alert when the save fails', async () => {
    const { wrapper } = await saveWith(false);
    expect(
      wrapper.findComponent({ name: 'UserProfilePersonalInfoForm' }).exists(),
    ).toBe(true);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('does not show uploaded pictures while they are paused', async () => {
    const wrapper = await mountSuspended(PersonalInfo, {
      props: {
        user: { ...createMockUser(), profile_pictures: ['a.jpg'] },
        isOwnProfile: true,
        save: vi.fn(),
      },
      global: G,
    });
    expect(
      wrapper
        .findComponent({ name: 'UserProfilePersonalInfoPictures' })
        .exists(),
    ).toBe(false);
  });
});
