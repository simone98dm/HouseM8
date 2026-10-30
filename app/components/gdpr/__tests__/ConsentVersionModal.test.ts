import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, enableAutoUnmount } from '@vue/test-utils';
import ConsentVersionModal from '~/components/gdpr/ConsentVersionModal.vue';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

// UiModal's scroll lock is a module-level counter: leaked mounts would skew it.
enableAutoUnmount(afterEach);

const signOut = vi.hoisted(() => vi.fn());
const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('useAuth', () => () => ({ signOut }));
mockNuxtImport('navigateTo', () => navigateToMock);

const acceptTerms = vi.hoisted(() => vi.fn());
vi.mock('~/composables/useConsents', () => ({
  useConsents: () => ({ acceptTerms }),
}));

const G = { stubs: { Teleport: true } };
const mount = (userConsentVersion: number | null) =>
  mountSuspended(ConsentVersionModal, {
    props: { userConsentVersion },
    global: G,
  });

async function tickAll(wrapper: Awaited<ReturnType<typeof mount>>) {
  for (const k of ['age', 'terms', 'privacy']) {
    await wrapper.find(`#consent-modal-${k}`).setValue(true);
  }
}

describe('ConsentVersionModal', () => {
  beforeEach(() => {
    acceptTerms.mockReset();
    signOut.mockReset();
    navigateToMock.mockReset();
  });

  it('is hidden when the user accepted the current version', async () => {
    const wrapper = await mount(LEGAL_POLICY_VERSION);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it.each([null, LEGAL_POLICY_VERSION - 1])(
    'shows a labelled modal dialog for version %s',
    async (v) => {
      const wrapper = await mount(v);
      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.exists()).toBe(true);
      expect(dialog.attributes('aria-modal')).toBe('true');
      expect(dialog.attributes('aria-labelledby')).toBe('consent-modal-title');
    },
  );

  it('uses different wording for first-time and updated terms', async () => {
    const first = await mount(null);
    const updated = await mount(LEGAL_POLICY_VERSION - 1);
    expect(first.find('#consent-modal-title').text()).toBe('Before you start');
    expect(updated.find('#consent-modal-title').text()).toBe(
      'We updated our terms',
    );
  });

  it('keeps submit enabled and flags unticked boxes on an incomplete submit', async () => {
    const wrapper = await mount(null);
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeUndefined();
    await wrapper.find('#consent-modal-age').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(acceptTerms).not.toHaveBeenCalled();
    expect(wrapper.find('#consent-modal-required').attributes('role')).toBe(
      'alert',
    );
    expect(
      wrapper.find('#consent-modal-age').attributes('aria-invalid'),
    ).toBeUndefined();
    expect(
      wrapper.find('#consent-modal-terms').attributes('aria-invalid'),
    ).toBe('true');
    expect(
      wrapper.find('#consent-modal-privacy').attributes('aria-invalid'),
    ).toBe('true');
  });

  it('emits accepted after a successful submit', async () => {
    acceptTerms.mockResolvedValue(true);
    const wrapper = await mount(null);
    await tickAll(wrapper);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(acceptTerms).toHaveBeenCalledOnce();
    expect(wrapper.emitted('accepted')).toHaveLength(1);
  });

  it('shows an alert and does not emit when the request fails', async () => {
    acceptTerms.mockResolvedValue(false);
    const wrapper = await mount(null);
    await tickAll(wrapper);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('accepted')).toBeUndefined();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('does not dismiss on Escape', async () => {
    const wrapper = await mount(null);
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('offers sign out as an alternative', async () => {
    signOut.mockResolvedValue({});
    const wrapper = await mount(null);
    await wrapper.find('button[type="button"]').trigger('click');
    await flushPromises();
    expect(signOut).toHaveBeenCalledOnce();
    expect(navigateToMock).toHaveBeenCalledWith('/auth/login');
  });

  describe('modal behaviour', () => {
    let root: HTMLElement;
    let trigger: HTMLButtonElement;
    beforeAll(() => {
      // happy-dom has no layout: UiModal's focus trap filters on offsetParent.
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
        configurable: true,
        get() {
          return this.parentNode;
        },
      });
    });
    beforeEach(() => {
      document.body.innerHTML = '';
      root = document.createElement('div');
      root.id = '__nuxt';
      trigger = document.createElement('button');
      trigger.id = 'outside-trigger';
      document.body.append(root, trigger);
      trigger.focus();
      document.documentElement.style.overflow = '';
    });

    const mountAttached = (v: number | null) =>
      mountSuspended(ConsentVersionModal, {
        props: { userConsentVersion: v },
        global: G,
        attachTo: document.body,
      });

    it('makes the app root inert, locks scroll and moves focus into the dialog', async () => {
      const wrapper = await mountAttached(LEGAL_POLICY_VERSION);
      // Open after mount so the dialog is attached when UiModal moves focus.
      await wrapper.setProps({ userConsentVersion: null });
      await flushPromises();
      expect(root.hasAttribute('inert')).toBe(true);
      expect(document.documentElement.style.overflow).toBe('hidden');
      const dialog = wrapper.find('[role="dialog"]').element;
      expect(dialog.contains(document.activeElement)).toBe(true);
      wrapper.unmount();
    });

    it('undoes inert and scroll lock and restores focus when closing', async () => {
      const wrapper = await mountAttached(null);
      await flushPromises();
      await wrapper.setProps({ userConsentVersion: LEGAL_POLICY_VERSION });
      await flushPromises();
      expect(root.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.style.overflow).toBe('');
      expect(document.activeElement).toBe(trigger);
      wrapper.unmount();
    });

    it('undoes inert and scroll lock on unmount while open', async () => {
      const wrapper = await mountAttached(null);
      await flushPromises();
      wrapper.unmount();
      expect(root.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.style.overflow).toBe('');
    });

    it('activates when the version becomes outdated after mount', async () => {
      const wrapper = await mountAttached(LEGAL_POLICY_VERSION);
      expect(root.hasAttribute('inert')).toBe(false);
      await wrapper.setProps({ userConsentVersion: LEGAL_POLICY_VERSION - 1 });
      await flushPromises();
      expect(root.hasAttribute('inert')).toBe(true);
      wrapper.unmount();
    });

    it('moves focus to the first unticked box on an invalid submit', async () => {
      const wrapper = await mountAttached(null);
      await flushPromises();
      await wrapper.find('#consent-modal-age').setValue(true);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(document.activeElement?.id).toBe('consent-modal-terms');
      wrapper.unmount();
    });

    it('wraps Tab from the last control to the first', async () => {
      const wrapper = await mountAttached(null);
      await flushPromises();
      const dialog = wrapper.find('[role="dialog"]');
      const items = dialog.element.querySelectorAll<HTMLElement>(
        'a[href], button, input, [tabindex]:not([tabindex="-1"])',
      );
      const first = items[0]!;
      const last = items[items.length - 1]!;
      last.focus();
      await dialog.trigger('keydown', { key: 'Tab' });
      expect(document.activeElement).toBe(first);
      wrapper.unmount();
    });

    it('wraps Shift+Tab from the first control to the last', async () => {
      const wrapper = await mountAttached(null);
      await flushPromises();
      const dialog = wrapper.find('[role="dialog"]');
      const items = dialog.element.querySelectorAll<HTMLElement>(
        'a[href], button, input, [tabindex]:not([tabindex="-1"])',
      );
      items[0]!.focus();
      await dialog.trigger('keydown', { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(items[items.length - 1]);
      wrapper.unmount();
    });

    it('ignores other keys', async () => {
      const wrapper = await mountAttached(null);
      await flushPromises();
      const before = document.activeElement;
      await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'a' });
      expect(document.activeElement).toBe(before);
      wrapper.unmount();
    });
  });

  it('still navigates to login when signOut rejects', async () => {
    signOut.mockRejectedValue(new Error('network'));
    const wrapper = await mount(null);
    const btn = wrapper
      .findAll('button')
      .find((b) => b.attributes('type') === 'button' && /sign/i.test(b.text()));
    await btn!.trigger('click');
    await flushPromises();
    expect(navigateToMock).toHaveBeenCalledWith('/auth/login');
  });
});
