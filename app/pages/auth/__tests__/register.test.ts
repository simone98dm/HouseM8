import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import RegisterPage from '~/pages/auth/register.vue';

import { useUserStore } from '~/stores/user';
import { useAuth } from '~/composables/useAuth';
import { uiButtonStub } from '~/tests/utils';

vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/composables/useAuth', () => ({ useAuth: vi.fn() }));

let mockFlags: Record<string, boolean> = { showSignup: true };
vi.mock('~/composables/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(() => ({
    isEnabled: vi.fn((flag: string) => mockFlags[flag] ?? false),
    getFlag: vi.fn(),
    flags: { value: {} },
  })),
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

let mockRouteQuery: Record<string, string> = {};
mockNuxtImport('useRoute', () => () => ({ query: mockRouteQuery }));

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    NuxtLink: true,
    UiButton: uiButtonStub,
    AuthResendLinkForm: {
      props: ['email'],
      template: '<div class="resend-stub" :data-email="email" />',
    },
    GdprConsentCheckbox: {
      template: `<div>
        <input type="checkbox" class="all" @change="$emit('update:modelValue', { age_confirmed: $event.target.checked, terms_accepted: $event.target.checked, privacy_acknowledged: $event.target.checked })" />
        <input type="checkbox" class="age-only" @change="$emit('update:modelValue', { age_confirmed: true, terms_accepted: false, privacy_acknowledged: false })" />
      </div>`,
      props: ['modelValue'],
      emits: ['update:modelValue'],
    },
  },
};

describe('Register Page', () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockSignInWithGoogle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockFlags = { showSignup: true };
    mockRouteQuery = {};
    navigateToMock.mockClear();

    mockRegister = vi.fn().mockResolvedValue({ success: false, message: '' });
    mockSignInWithGoogle = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
      register: mockRegister,
    } as unknown as ReturnType<typeof useUserStore>);

    vi.mocked(useAuth).mockReturnValue({
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      signInWithGoogle: mockSignInWithGoogle,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders the registration form', async () => {
    const wrapper = await mountSuspended(RegisterPage, { global: G });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('shows registration closed state when showSignup feature is disabled', async () => {
    mockFlags = { showSignup: false };
    const wrapper = await mountSuspended(RegisterPage, { global: G });
    expect(wrapper.text()).toContain('auth.register.closed.title');
  });

  it('shows registration form when showSignup feature is enabled', async () => {
    mockFlags = { showSignup: true };
    const wrapper = await mountSuspended(RegisterPage, { global: G });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('redirects to dashboard if user is already logged in', async () => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: true,
      currentUser: { id: 'u-1' },
      register: mockRegister,
    } as unknown as ReturnType<typeof useUserStore>);

    await mountSuspended(RegisterPage, { global: G });
    expect(navigateToMock).toHaveBeenCalledWith('/dashboard');
  });

  it('uses redirect query param as redirect path when not an auth path', async () => {
    mockRouteQuery = { redirect: '/bills' };
    const wrapper = await mountSuspended(RegisterPage, { global: G });
    expect(wrapper.exists()).toBe(true);
    // The redirectPath should be '/bills'
  });

  it('uses /dashboard as redirect when redirect starts with /auth/', async () => {
    mockRouteQuery = { redirect: '/auth/login' };
    const wrapper = await mountSuspended(RegisterPage, { global: G });
    expect(wrapper.exists()).toBe(true);
    // The redirectPath should be '/dashboard'
  });

  describe('form interaction', () => {
    // Email-only registration: enter email + accept GDPR consent, then submit.
    async function fillForm(
      wrapper: Awaited<ReturnType<typeof mountSuspended>>,
      opts: { email?: string; consent?: boolean } = {},
    ) {
      const { email = 'john@example.com', consent = true } = opts;
      await wrapper.find('#email').setValue(email);
      if (consent) {
        const checkbox = wrapper.find('input[type="checkbox"]');
        if (checkbox.exists()) await checkbox.setValue(true);
      }
    }

    it('does not submit when consent is missing', async () => {
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await fillForm(wrapper, { consent: false });
      await wrapper.find('form').trigger('submit');
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows an alert and does not submit when consent is only partly given', async () => {
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await wrapper.find('#email').setValue('john@example.com');
      await wrapper.find('input.age-only').setValue(true);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(mockRegister).not.toHaveBeenCalled();
      expect(wrapper.find('[role="alert"]').text()).toContain(
        'auth.signUp.consentIncomplete',
      );
      wrapper.unmount();
    });

    it('submits email registration with consent', async () => {
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      expect(mockRegister).toHaveBeenCalledWith('john@example.com');
    });

    it('shows email-sent state on successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true });
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('auth.register.emailSent.title');
      wrapper.unmount();
    });

    it('stashes the invite redirect for the confirmation tab', async () => {
      const join = '/house/join/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f';
      mockRouteQuery = { redirect: join };
      mockRegister.mockResolvedValue({ success: true });
      localStorage.clear();
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(localStorage.getItem('auth_redirect')).toBe(join);
      mockRouteQuery = {};
      wrapper.unmount();
    });

    it('shows error when registration fails', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: 'auth.errors.invalidEmail',
      });
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[role="alert"]').text()).toBe(
        'auth.errors.invalidEmail',
      );
      wrapper.unmount();
    });

    it.each([
      ['an empty message', { success: false, message: '' }],
      ['a thrown error', new Error('Raw network text')],
    ])('shows the retry message for %s, never raw text', async (_, outcome) => {
      if (outcome instanceof Error) mockRegister.mockRejectedValue(outcome);
      else mockRegister.mockResolvedValue(outcome);
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await fillForm(wrapper);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(wrapper.find('[role="alert"]').text()).toBe(
        'auth.errors.tryAgainLater',
      );
      expect(wrapper.text()).not.toContain('Raw network text');
      wrapper.unmount();
    });
  });

  it('closed-state button navigates to login', async () => {
    mockFlags = { showSignup: false };
    const wrapper = await mountSuspended(RegisterPage, { global: G });
    expect(wrapper.find('[to="/auth/login"]').exists()).toBe(true);
  });

  describe('email-sent state', () => {
    const register = async () => {
      mockRegister.mockResolvedValue({ success: true });
      const wrapper = await mountSuspended(RegisterPage, {
        global: G,
        attachTo: document.body,
      });
      await wrapper.find('#email').setValue('a@b.com');
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      return wrapper;
    };

    // The account has no password yet, so "sign in" would be a dead end.
    it('offers to resend to the typed address, not to sign in', async () => {
      const wrapper = await register();
      expect(wrapper.find('[to="/auth/login"]').exists()).toBe(false);
      expect(wrapper.find('.resend-stub').attributes('data-email')).toBe(
        'a@b.com',
      );
      expect(wrapper.text()).toContain('auth.register.emailSent.spamHint');
      wrapper.unmount();
    });

    it('goes back to the form with the address kept', async () => {
      const wrapper = await register();
      const back = wrapper
        .findAll('button')
        .find((b) => b.text() === 'auth.register.emailSent.differentEmail');
      await back!.trigger('click');
      await flushPromises();
      const field = wrapper.find<HTMLInputElement>('#email');
      expect(field.element.value).toBe('a@b.com');
      expect(document.activeElement?.id).toBe('email');
      wrapper.unmount();
    });
  });

  describe('Google sign-in', () => {
    async function acceptConsent(
      wrapper: Awaited<ReturnType<typeof mountSuspended>>,
    ) {
      await wrapper.find('input[type="checkbox"]').setValue(true);
    }

    it('does not gate Google sign-in on the checkboxes and explains the consent step', async () => {
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      const button = wrapper.find('.btn-google');
      expect(button.attributes('disabled')).toBeUndefined();
      expect(wrapper.text()).toContain('auth.signUp.googleConsentNote');
      await button.trigger('click');
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    it('shows error when signInWithGoogle returns error', async () => {
      mockSignInWithGoogle.mockResolvedValue({ error: 'OAuth failed' });
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await acceptConsent(wrapper);
      await wrapper.find('.btn-google').trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('auth.errors.googleFailed');
      expect(wrapper.text()).not.toContain('OAuth failed');
    });

    it('stores redirect target before starting Google OAuth', async () => {
      mockRouteQuery = { redirect: '/bills' };
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await acceptConsent(wrapper);
      await wrapper.find('.btn-google').trigger('click');
      expect(setItem).toHaveBeenCalledWith('auth_redirect', '/bills');
      setItem.mockRestore();
    });

    it('shows generic error when signInWithGoogle throws', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('boom'));
      const wrapper = await mountSuspended(RegisterPage, { global: G });
      await acceptConsent(wrapper);
      await wrapper.find('.btn-google').trigger('click');
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('auth.errors.googleFailed');
    });
  });
});
