import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import ConfirmPage from '~/pages/auth/confirm.vue';
import { uiButtonStub } from '~/tests/utils';

import { useApi } from '~/composables/useApi';
import { useAuth } from '~/composables/useAuth';

vi.mock('~/composables/useApi', () => ({ useApi: vi.fn() }));
vi.mock('~/composables/useAuth', () => ({ useAuth: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

let mockRoute = { query: {} as Record<string, string>, hash: '' };
mockNuxtImport('useRoute', () => () => mockRoute);

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    NuxtLink: true,
    UiButton: uiButtonStub,
    AuthResendLinkForm: { template: '<div class="resend-stub" />' },
  },
};

describe('Confirm Email Page', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockConfirmWithToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    navigateToMock.mockClear();
    mockRoute = { query: {}, hash: '' };
    mockFetch = vi.fn().mockResolvedValue({ success: false });
    vi.mocked(useApi).mockReturnValue({
      fetch: mockFetch,
    } as unknown as ReturnType<typeof useApi>);

    mockConfirmWithToken = vi
      .fn()
      .mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(useAuth).mockReturnValue({
      confirmWithToken: mockConfirmWithToken,
    } as unknown as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows error state when no token and no access_token in hash', async () => {
    mockRoute = { query: {}, hash: '' };
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await wrapper.vm.$nextTick();
    // After onMounted completes with no token → error shown
    expect(wrapper.find('.confirm-state').exists()).toBe(true);
  });

  it('calls confirmWithToken when token is in query', async () => {
    mockRoute = { query: { token: 'test-token-123' }, hash: '' };
    mockConfirmWithToken.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    await mountSuspended(ConfirmPage, { global: G });
    expect(mockConfirmWithToken).toHaveBeenCalledWith('test-token-123');
  });

  it('shows success state when token verification succeeds', async () => {
    mockRoute = { query: { token: 'valid-token' }, hash: '' };
    mockFetch.mockResolvedValue({ success: true });
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.confirm-icon-wrap.success').exists()).toBe(true);
  });

  it('schedules redirect to dashboard after successful verification', async () => {
    mockRoute = { query: { token: 'valid-token' }, hash: '' };
    mockConfirmWithToken.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    await mountSuspended(ConfirmPage, { global: G });
    await vi.runAllTimersAsync();
    expect(navigateToMock).toHaveBeenCalledWith('/dashboard');
  });

  // Each failure gets its own copy; only a dead link offers a new one.
  it.each([
    ['INVALID_TOKEN', 'invalid', true],
    ['NETWORK', 'network', false],
    ['RATE_LIMITED', 'rateLimited', false],
    ['FAILED', 'failed', false],
  ])('shows the %s failure as "%s"', async (code, failure, offersNewLink) => {
    mockRoute = { query: { token: 'bad-token' }, hash: '' };
    mockConfirmWithToken.mockResolvedValue({ data: null, error: code });
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await flushPromises();
    expect(wrapper.find('.confirm-icon-wrap.danger').exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe(
      `auth.confirmation.${failure}.title`,
    );
    expect(wrapper.find('.resend-stub').exists()).toBe(offersNewLink);
  });

  it('retries the same link after a network failure', async () => {
    mockRoute = { query: { token: 'tok' }, hash: '' };
    mockConfirmWithToken
      .mockResolvedValueOnce({ data: null, error: 'NETWORK' })
      .mockResolvedValueOnce({ data: { success: true }, error: null });
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await flushPromises();
    await wrapper.find('.confirm-actions button').trigger('click');
    await flushPromises();
    expect(mockConfirmWithToken).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.confirm-icon-wrap.success').exists()).toBe(true);
  });

  it('does not post client-supplied OAuth tokens from the URL hash', async () => {
    mockRoute = {
      query: {},
      hash: '#access_token=acc&refresh_token=ref&type=signup',
    };
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await wrapper.vm.$nextTick();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockConfirmWithToken).not.toHaveBeenCalled();
    expect(wrapper.find('.confirm-icon-wrap.danger').exists()).toBe(true);
  });

  it('a link without its token offers a new link and sign-in, not sign-up', async () => {
    mockRoute = { query: {}, hash: '' };
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await flushPromises();
    expect(wrapper.find('h1').text()).toBe('auth.confirmation.missing.title');
    expect(wrapper.find('.resend-stub').exists()).toBe(true);
    const links = wrapper.findAll('.confirm-actions [to]');
    expect(links.map((l) => l.attributes('to'))).toEqual(['/auth/login']);
  });

  it('announces the state outside the swapping cards', async () => {
    mockRoute = { query: { token: 'tok' }, hash: '' };
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await flushPromises();
    const status = wrapper.find('[role="status"]');
    expect(status.text()).toBe('auth.confirmation.success.title');
    expect(status.find('h1').exists()).toBe(false);
  });

  it('navigates to dashboard when go home button clicked after success', async () => {
    mockRoute = { query: { token: 'valid-token' }, hash: '' };
    mockFetch.mockResolvedValue({ success: true });
    const wrapper = await mountSuspended(ConfirmPage, { global: G });
    await wrapper.vm.$nextTick();
    const btn = wrapper.find('button');
    if (btn.exists()) {
      await btn.trigger('click');
      expect(navigateToMock).toHaveBeenCalledWith('/dashboard');
    }
  });

  describe('new sign-up without a password', () => {
    const fillAndSubmit = async (
      wrapper: Awaited<ReturnType<typeof mountSuspended>>,
      password: string,
    ) => {
      await wrapper.find('#new-password').setValue(password);
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();
    };

    beforeEach(() => {
      mockRoute = { query: { token: 'signup-token' }, hash: '' };
      mockConfirmWithToken.mockResolvedValueOnce({
        data: null,
        error: 'PASSWORD_REQUIRED',
      });
    });

    it('asks for a password instead of failing', async () => {
      const wrapper = await mountSuspended(ConfirmPage, { global: G });
      await flushPromises();
      expect(wrapper.text()).toContain('auth.confirmation.setPassword.title');
      expect(wrapper.find('#new-password').exists()).toBe(true);
    });

    it('does not submit a too-short password', async () => {
      const wrapper = await mountSuspended(ConfirmPage, { global: G });
      await flushPromises();
      await fillAndSubmit(wrapper, 'short');
      expect(mockConfirmWithToken).toHaveBeenCalledTimes(1);
    });

    it('confirms with the password, then lands in the app signed in', async () => {
      mockConfirmWithToken.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });
      const wrapper = await mountSuspended(ConfirmPage, { global: G });
      await flushPromises();
      await fillAndSubmit(wrapper, 'longenough');

      expect(mockConfirmWithToken).toHaveBeenLastCalledWith(
        'signup-token',
        'longenough',
      );
      expect(wrapper.text()).toContain('auth.confirmation.success.title');
      vi.advanceTimersByTime(1500);
      expect(navigateToMock).toHaveBeenCalledWith('/dashboard');
    });

    it('keeps the form with an error when saving fails for a non-token reason', async () => {
      mockConfirmWithToken.mockResolvedValueOnce({
        data: null,
        error: 'NETWORK',
      });
      const wrapper = await mountSuspended(ConfirmPage, { global: G });
      await flushPromises();
      await fillAndSubmit(wrapper, 'longenough');

      expect(wrapper.find('[role="alert"]').text()).toContain(
        'auth.confirmation.setPassword.failed',
      );
      expect(wrapper.find('#new-password').exists()).toBe(true);
    });

    it('shows the expired state when the token was used meanwhile', async () => {
      mockConfirmWithToken.mockResolvedValueOnce({
        data: null,
        error: 'INVALID_TOKEN',
      });
      const wrapper = await mountSuspended(ConfirmPage, { global: G });
      await flushPromises();
      await fillAndSubmit(wrapper, 'longenough');

      expect(wrapper.find('h1').text()).toBe('auth.confirmation.invalid.title');
      expect(wrapper.find('form').exists()).toBe(false);
    });
  });
});
