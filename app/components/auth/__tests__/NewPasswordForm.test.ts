import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import NewPasswordForm from '~/components/auth/NewPasswordForm.vue';
import { uiButtonStub } from '~/tests/utils';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = { stubs: { UiButton: uiButtonStub } };

describe('AuthNewPasswordForm', () => {
  let wrapper: Awaited<ReturnType<typeof mountSuspended>>;

  afterEach(() => wrapper?.unmount());

  const mount = async (props: Record<string, unknown> = {}) => {
    wrapper = await mountSuspended(NewPasswordForm, {
      props: { submitLabel: 'Save', ...props },
      global: G,
      attachTo: document.body,
    });
    return wrapper;
  };

  const submit = async (password: string) => {
    await wrapper.find('#new-password').setValue(password);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
  };

  it('keeps the submit button enabled while empty (validate on submit)', async () => {
    await mount();
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeUndefined();
  });

  it('shows the length rule before any attempt', async () => {
    await mount();
    expect(wrapper.text()).toContain('auth.passwordReset.passwordHint');
    expect(wrapper.find('#new-password').attributes('aria-invalid')).toBe(
      'false',
    );
  });

  it('flags and focuses a too-short password without emitting', async () => {
    await mount();
    await submit('short');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.find('#new-password').attributes('aria-invalid')).toBe(
      'true',
    );
    expect(document.activeElement?.id).toBe('new-password');
  });

  it('has one password field and a "show password" switch', async () => {
    await mount();
    expect(wrapper.find('#confirm-password').exists()).toBe(false);
    const field = wrapper.find('#new-password');
    expect(field.attributes('type')).toBe('password');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(field.attributes('type')).toBe('text');
  });

  it('emits the password once it is long enough', async () => {
    await mount();
    await submit('longenough');
    expect(wrapper.emitted('submit')).toEqual([['longenough']]);
  });

  it('uses the passed password label, defaulting to "new password"', async () => {
    await mount();
    expect(wrapper.text()).toContain('auth.passwordReset.newPassword');
    await mount({ passwordLabel: 'Password' });
    expect(wrapper.text()).toContain('Password');
    expect(wrapper.text()).not.toContain('auth.passwordReset.newPassword');
  });
});
