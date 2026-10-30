import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import PasswordResetPage from '~/pages/auth/password-reset.vue';
import { uiButtonStub } from '~/tests/utils';

import { usePasswordReset } from '~/composables/usePasswordReset';

vi.mock('~/composables/usePasswordReset', () => ({
  usePasswordReset: vi.fn(),
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

let mockRoute = { query: {} as Record<string, string> };
mockNuxtImport('useRoute', () => () => mockRoute);

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, NuxtLink: true, UiButton: uiButtonStub },
};

describe('Password Reset Page', () => {
  let mockConfirmReset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    navigateToMock.mockClear();
    mockRoute = { query: { token: 'valid-token' } };
    mockConfirmReset = vi
      .fn()
      .mockResolvedValue({ success: true, error: null, errorType: null });
    vi.mocked(usePasswordReset).mockReturnValue({
      requestReset: vi.fn(),
      confirmReset: mockConfirmReset,
    } as unknown as ReturnType<typeof usePasswordReset>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a missing-token state when no token is in the query', async () => {
    mockRoute = { query: {} };
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    expect(wrapper.text()).toContain('auth.passwordReset.missingToken.title');
    expect(wrapper.find('#new-password').exists()).toBe(false);
  });

  it('renders the reset form when a token is present', async () => {
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    expect(wrapper.find('#new-password').exists()).toBe(true);
    expect(wrapper.find('#confirm-password').exists()).toBe(false);
  });

  it('never disables the submit button', async () => {
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeUndefined();
  });

  it('on submit with a short password, names the field, flags it and does not call the API', async () => {
    const wrapper = await mountSuspended(PasswordResetPage, {
      global: G,
      attachTo: document.body,
    });
    await wrapper.find('#new-password').setValue('short');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    expect(mockConfirmReset).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('auth.passwordReset.passwordHint');
    expect(wrapper.find('#new-password').attributes('aria-invalid')).toBe(
      'true',
    );
    expect(document.activeElement?.id).toBe('new-password');
    wrapper.unmount();
  });

  it('describes the field by the page error after a network failure', async () => {
    mockConfirmReset.mockResolvedValue({
      success: false,
      error: null,
      errorType: 'network',
    });
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    await wrapper.find('#new-password').setValue('longenough1');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.vm.$nextTick();
    expect(
      wrapper.find('#new-password').attributes('aria-describedby'),
    ).toContain('password-reset-error');
  });

  // No silent redirect: the success state hands over with its own button.
  it('submits the token and new password, then offers sign-in without redirecting', async () => {
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    await wrapper.find('#new-password').setValue('longenough1');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    expect(mockConfirmReset).toHaveBeenCalledWith('valid-token', 'longenough1');
    expect(wrapper.text()).toContain('auth.passwordReset.success.title');

    await vi.runAllTimersAsync();
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(wrapper.find('[to="/auth/login?reset=true"]').exists()).toBe(true);
  });

  it('shows an invalid-token state distinct from a network failure', async () => {
    mockConfirmReset.mockResolvedValue({
      success: false,
      error: 'Invalid or expired reset token',
      errorType: 'invalid-token',
    });
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    await wrapper.find('#new-password').setValue('longenough1');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('auth.passwordReset.invalidToken.title');
    expect(wrapper.find('#new-password').exists()).toBe(false);
  });

  it('shows a distinct network-failure state that keeps the form for retry', async () => {
    mockConfirmReset.mockResolvedValue({
      success: false,
      error: null,
      errorType: 'network',
    });
    const wrapper = await mountSuspended(PasswordResetPage, { global: G });
    await wrapper.find('#new-password').setValue('longenough1');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    // Network failure must not be confused with an invalid/expired token —
    // the form stays so the user can retry without re-typing anything.
    expect(wrapper.text()).not.toContain(
      'auth.passwordReset.invalidToken.title',
    );
    expect(wrapper.find('#new-password').exists()).toBe(true);
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'auth.passwordReset.errors.network',
    );
  });
});
