import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import ResendLinkForm from '~/components/auth/ResendLinkForm.vue';
import { useUserStore } from '~/stores/user';
import { uiButtonStub } from '~/tests/utils';

vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, string>) =>
    params?.email ? `${key}:${params.email}` : key,
  locale: { value: 'en' },
}));

const G = { stubs: { Icon: true, UiButton: uiButtonStub } };

describe('AuthResendLinkForm', () => {
  let mockResend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockResend = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(useUserStore).mockReturnValue({
      resendConfirmation: mockResend,
    } as unknown as ReturnType<typeof useUserStore>);
  });

  it('with a known address is one button that resends to it', async () => {
    const wrapper = await mountSuspended(ResendLinkForm, {
      props: { email: 'a@b.com' },
      global: G,
    });
    expect(wrapper.find('input').exists()).toBe(false);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockResend).toHaveBeenCalledWith('a@b.com');
    expect(wrapper.find('[role="status"]').text()).toBe(
      'auth.resend.sent:a@b.com',
    );
  });

  it('without an address asks for one before sending', async () => {
    const wrapper = await mountSuspended(ResendLinkForm, {
      global: G,
      attachTo: document.body,
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockResend).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('auth.resend.emailRequired');
    expect(document.activeElement?.tagName).toBe('INPUT');

    await wrapper.find('input').setValue('  c@d.com ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockResend).toHaveBeenCalledWith('c@d.com');
    wrapper.unmount();
  });

  it('shows the translated failure', async () => {
    mockResend.mockResolvedValue({
      success: false,
      error: 'auth.errors.tooManyAttempts',
    });
    const wrapper = await mountSuspended(ResendLinkForm, {
      props: { email: 'a@b.com' },
      global: G,
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe(
      'auth.errors.tooManyAttempts',
    );
    expect(wrapper.find('[role="status"]').text()).toBe('');
  });
});
