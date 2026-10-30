import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import LoginPage from '~/pages/auth/login.vue';
import { useUserStore } from '~/stores/user';
import { useAuth } from '~/composables/useAuth';
import { uiButtonStub } from '~/tests/utils';

vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/composables/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('~/composables/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(() => ({ isEnabled: () => true })),
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

let mockQuery: Record<string, string> = {};
mockNuxtImport('useRoute', () => () => ({ query: mockQuery }));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiButton: uiButtonStub,
    NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  },
};

describe('Login page', () => {
  let mockLogin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = {};
    mockLogin = vi.fn();
    vi.mocked(useUserStore).mockReturnValue({
      login: mockLogin,
    } as unknown as ReturnType<typeof useUserStore>);
    vi.mocked(useAuth).mockReturnValue({
      signInWithGoogle: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  const signIn = async () => {
    const wrapper = await mountSuspended(LoginPage, { global: G });
    await wrapper.find('#email').setValue('a@b.com');
    await wrapper.find('#password').setValue('wrong-pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    return wrapper;
  };

  it('puts "forgot password" after the password field in tab order', async () => {
    const wrapper = await mountSuspended(LoginPage, { global: G });
    const focusable = wrapper
      .findAll('input, a[href]')
      .map((el) => el.attributes('id') ?? el.attributes('href'));
    expect(focusable.indexOf('password')).toBeLessThan(
      focusable.indexOf('/auth/forgot-password'),
    );
    expect(focusable.indexOf('email')).toBe(focusable.indexOf('password') - 1);
  });

  it('marks both fields invalid when the credentials are rejected', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: 'auth.errors.invalidCredentials',
    });
    const wrapper = await signIn();
    expect(wrapper.find('[role="alert"]').text()).toBe(
      'auth.errors.invalidCredentials',
    );
    expect(wrapper.find('#email').attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('#password').attributes('aria-invalid')).toBe('true');
  });

  it('does not blame the fields for a network failure', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: 'auth.errors.network',
    });
    const wrapper = await signIn();
    expect(wrapper.find('[role="alert"]').text()).toBe('auth.errors.network');
    expect(wrapper.find('#email').attributes('aria-invalid')).toBe('false');
  });

  it('announces the reset confirmation politely', async () => {
    mockQuery = { reset: 'true' };
    const wrapper = await mountSuspended(LoginPage, { global: G });
    expect(wrapper.find('[role="status"]').text()).toContain(
      'auth.login.passwordResetSuccess',
    );
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
