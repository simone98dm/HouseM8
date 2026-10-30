import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import LoginPage from '~/pages/auth/login.vue';
import { uiButtonStub } from '~/tests/utils';

const loginMock = vi.hoisted(() => vi.fn());
mockNuxtImport('useUserStore', () => () => ({ login: loginMock }));
mockNuxtImport('useAuth', () => () => ({ signInWithGoogle: vi.fn() }));
mockNuxtImport('useFeatureFlags', () => () => ({ isEnabled: () => true }));
mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));
const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, NuxtLink: true, UiButton: uiButtonStub },
};

// Validate on submit (DESIGN.md): Sign In is never disabled to signal an
// incomplete form, so keyboard users can reach it and learn what's missing.
describe('Login page validation', () => {
  let wrapper: Awaited<ReturnType<typeof mountSuspended>>;

  beforeEach(() => {
    loginMock.mockReset().mockResolvedValue({ success: true });
    navigateToMock.mockClear();
  });

  afterEach(() => wrapper?.unmount());

  const mount = async () => {
    wrapper = await mountSuspended(LoginPage, {
      global: G,
      attachTo: document.body,
    });
    return wrapper;
  };

  it('keeps Sign In enabled while the fields are empty', async () => {
    await mount();
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeUndefined();
  });

  it('names and focuses a missing email instead of signing in', async () => {
    await mount();
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(loginMock).not.toHaveBeenCalled();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'auth.login.emailRequired',
    );
    expect(document.activeElement?.id).toBe('email');
  });

  it('names and focuses a missing password', async () => {
    await mount();
    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(loginMock).not.toHaveBeenCalled();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'auth.login.passwordRequired',
    );
    expect(document.activeElement?.id).toBe('password');
  });

  it('signs in once both fields are filled', async () => {
    await mount();
    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('#password').setValue('secret');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret', false);
  });
});
