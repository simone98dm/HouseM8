import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import PersonalInfoView from '~/components/user/profile/PersonalInfoView.vue';
import { createMockUser } from '~/tests/utils';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UserProfilePersonalInfoSocial: true },
};

describe('PersonalInfoView', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(PersonalInfoView, {
      props: { user: createMockUser({ gender: 'male' }) },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the empty state for an own profile with no personal info', async () => {
    const wrapper = await mountSuspended(PersonalInfoView, {
      props: {
        user: createMockUser({
          gender: undefined,
          occupation_type: undefined,
          languages: [],
          pets: undefined,
          telephone: undefined,
          instagram: undefined,
          twitter: undefined,
          linkedin: undefined,
          tiktok: undefined,
        }),
        isOwnProfile: true,
      },
      global: G,
    });
    expect(wrapper.text()).toContain('profile.personal.noInformation');
  });

  it('does not show the empty state when viewing someone else with no personal info', async () => {
    const wrapper = await mountSuspended(PersonalInfoView, {
      props: {
        user: createMockUser({
          gender: undefined,
          occupation_type: undefined,
          languages: [],
          pets: undefined,
        }),
        isOwnProfile: false,
      },
      global: G,
    });
    expect(wrapper.text()).not.toContain('profile.personal.noInformation');
  });

  it('shows a translated label for the gender value', async () => {
    const wrapper = await mountSuspended(PersonalInfoView, {
      props: { user: createMockUser({ gender: 'prefer_not_to_say' }) },
      global: G,
    });
    expect(wrapper.text()).toContain('Prefer not to say');
    expect(wrapper.text()).not.toContain('prefer_not_to_say');
  });

  it('appends the study field to the occupation for students', async () => {
    const wrapper = await mountSuspended(PersonalInfoView, {
      props: {
        user: createMockUser({
          occupation_type: 'student',
          study_field: 'Computer Science',
        }),
      },
      global: G,
    });
    expect(wrapper.text()).toContain('Student - Computer Science');
  });

  it('renders each language as a chip', async () => {
    const wrapper = await mountSuspended(PersonalInfoView, {
      props: { user: createMockUser({ languages: ['English', 'Italian'] }) },
      global: G,
    });
    expect(wrapper.text()).toContain('English');
    expect(wrapper.text()).toContain('Italian');
  });
});
