import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import UserPage from '~/pages/user/[id].vue';
import {
  createMockUser,
  createMockHouse,
  createMockHouseMember,
} from '~/tests/utils';

const state = vi.hoisted(() => ({
  routeId: 'me',
  getUserById: vi.fn(),
}));

const me = createMockUser({
  id: 'me',
  first_name: 'Ada',
  last_name: 'Rossi',
  email: 'ada@example.com',
  deleted_at: null,
});
const other = createMockUser({
  id: 'other',
  first_name: 'Bob',
  last_name: 'Verdi',
  email: 'bob@example.com',
});
const house = createMockHouse({ id: 'h1' });
const members = [
  createMockHouseMember({ user_id: 'me', role: 'owner', user: me }),
  createMockHouseMember({
    user_id: 'other',
    role: 'member',
    user: other,
    joined_at: '2025-03-15T00:00:00Z',
  }),
];

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, p?: Record<string, unknown>) =>
    p ? `${key}|${Object.values(p).join('|')}` : key,
  locale: { value: 'en' },
}));
mockNuxtImport('useRoute', () => () => ({ params: { id: state.routeId } }));
mockNuxtImport('navigateTo', () => vi.fn());
mockNuxtImport('useHousesStore', () => () => ({
  currentHouse: house,
  activeMembers: members,
  lastFetch: new Date(),
  isLoading: false,
  reset: vi.fn(),
}));
mockNuxtImport('useExpensesStore', () => () => ({ reset: vi.fn() }));
mockNuxtImport('useUserStore', () => () => ({
  currentUser: me,
  updateProfile: vi.fn(),
}));
mockNuxtImport('useNotificationStore', () => () => ({ error: vi.fn() }));
mockNuxtImport('useUserApi', () => () => ({
  getUserById: state.getUserById,
}));
mockNuxtImport('useAuth', () => () => ({ signOut: vi.fn() }));

const stubs = {
  Icon: true,
  AppPageHeader: true,
  UiUserAvatar: true,
  UserProfile: true,
  UserAccountPanel: true,
  GdprAccountDeletion: { template: '<div data-test="deletion" />' },
};

const render = async (routeId: string) => {
  state.routeId = routeId;
  const w = await mountSuspended(UserPage, { global: { stubs } });
  await vi.waitFor(() =>
    expect(w.find('[role="status"]').exists()).toBe(false),
  );
  return w;
};

describe('user/[id] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getUserById.mockResolvedValue(other);
  });

  it('shows the email on the own profile', async () => {
    const w = await render('me');
    expect(w.text()).toContain('Ada Rossi');
    expect(w.text()).toContain('ada@example.com');
  });

  it('hides the email on another user profile', async () => {
    const w = await render('other');
    expect(w.text()).not.toContain('bob@example.com');
  });

  it('shows name, role badge and member-since for another user', async () => {
    const w = await render('other');
    expect(state.getUserById).toHaveBeenCalledWith('other');
    expect(w.text()).toContain('Bob Verdi');
    expect(w.find('.badge').text()).toBe('Member');
    expect(w.text()).toMatch(/member since/i);
    expect(w.text()).toContain('2025');
  });

  it('renders the danger zone with account deletion on the own profile', async () => {
    const w = await render('me');
    const zone = w.find('section[aria-labelledby="profile-danger-heading"]');
    expect(zone.exists()).toBe(true);
    expect(zone.text()).toContain('Danger zone');
    expect(zone.find('[data-test="deletion"]').exists()).toBe(true);
  });

  it('has no danger zone on another user profile', async () => {
    const w = await render('other');
    expect(w.find('#profile-danger-heading').exists()).toBe(false);
    expect(w.find('[data-test="deletion"]').exists()).toBe(false);
  });
});
