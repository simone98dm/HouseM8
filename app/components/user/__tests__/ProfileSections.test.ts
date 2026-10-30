import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Profile from '~/components/user/Profile.vue';
import { createMockUser, createMockHouse } from '~/tests/utils';

const G = {
  mocks: { $t: (k: string, p?: Record<string, string>) => k + (p?.name ?? '') },
  stubs: {
    Icon: true,
    UserProfilePersonalInfo: {
      template: '<h2 id="profile-personal-heading">info</h2>',
    },
    UserLeaveHouseModal: true,
  },
};
const member = {
  id: 'm1',
  user_id: 'u1',
  house_id: 'h1',
  role: 'admin',
  joined_at: '2025-01-01',
} as never;

describe('Profile sections', () => {
  it('shows a friendly empty line when another user shared nothing', async () => {
    const wrapper = await mountSuspended(Profile, {
      props: {
        user: createMockUser({ first_name: 'Ada', last_name: 'L' }),
        isOwnProfile: false,
        updateProfile: vi.fn(),
      },
      global: G,
    });
    expect(wrapper.text()).toContain('user.noDetailsAda L');
  });

  it('renders a labelled house section with link, role and leave button on own profile', async () => {
    const wrapper = await mountSuspended(Profile, {
      props: {
        user: createMockUser(),
        memberInfo: member,
        isOwnProfile: true,
        updateProfile: vi.fn(),
        currentHouse: createMockHouse({ id: 'h1', name: 'Casa' }),
      },
      global: G,
    });
    expect(
      wrapper.find('section[aria-labelledby="profile-house-heading"]').exists(),
    ).toBe(true);
    expect(wrapper.find('h2#profile-house-heading').text()).toContain(
      'profile.currentHouse.title',
    );
    expect(wrapper.find('a[href="/house/h1"]').text()).toBe('Casa');
    expect(wrapper.text()).toContain('profile.currentHouse.admin');
    expect(wrapper.text()).toContain('profile.currentHouse.leaveHouse');
  });
});
