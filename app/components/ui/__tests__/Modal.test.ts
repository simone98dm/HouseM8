import { describe, it, expect, afterEach } from 'vitest';
import { h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UiModal from '~/components/ui/Modal.vue';

const mounted: Array<{ unmount: () => void }> = [];
const mountModal = async (
  ...args: Parameters<typeof mountSuspended<typeof UiModal>>
) => {
  const w = await mountSuspended(...args);
  mounted.push(w);
  return w;
};

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount());
  // Own property added by withLayout(); deleting it restores happy-dom's.
  Reflect.deleteProperty(HTMLElement.prototype, 'offsetParent');
  // clean up teleported nodes
  document
    .querySelectorAll('[role="dialog"], [role="alertdialog"]')
    .forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
});

describe('UiModal', () => {
  it('is hidden when show=false', async () => {
    await mountModal(UiModal, { props: { show: false } });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('is visible when show=true', async () => {
    await mountModal(UiModal, { props: { show: true, title: 'Test' } });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders title inside dialog', async () => {
    await mountModal(UiModal, {
      props: { show: true, title: 'My Dialog' },
    });
    expect(document.body.textContent).toContain('My Dialog');
  });

  it('renders default slot content', async () => {
    await mountModal(UiModal, {
      props: { show: true },
      slots: { default: '<p>Body text</p>' },
    });
    expect(document.body.textContent).toContain('Body text');
  });

  it('renders footer slot', async () => {
    await mountModal(UiModal, {
      props: { show: true },
      slots: { footer: '<span>Footer content</span>' },
    });
    expect(document.body.textContent).toContain('Footer content');
  });

  it('emits close when backdrop clicked', async () => {
    const wrapper = await mountModal(UiModal, {
      props: { show: true, title: 'Dialog' },
    });
    document.querySelector<HTMLElement>('.modal-backdrop')!.click();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close when Escape key pressed', async () => {
    const wrapper = await mountModal(UiModal, {
      props: { show: true, title: 'Dialog' },
    });
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('puts role, aria-modal and aria-labelledby on the panel, not the backdrop', async () => {
    await mountModal(UiModal, { props: { show: true, title: 'Dialog' } });
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.classList.contains('modal-content')).toBe(true);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const id = dialog.getAttribute('aria-labelledby')!;
    expect(document.getElementById(id)?.textContent).toContain('Dialog');
    expect(
      document.querySelector('.modal-backdrop')!.hasAttribute('role'),
    ).toBe(false);
  });

  it('supports role=alertdialog', async () => {
    await mountModal(UiModal, {
      props: { show: true, title: 'Dialog', role: 'alertdialog' },
    });
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('persistent ignores Escape and backdrop click but not the close button', async () => {
    const wrapper = await mountModal(UiModal, {
      props: { show: true, title: 'Dialog', persistent: true },
    });
    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    document.querySelector<HTMLElement>('.modal-backdrop')!.click();
    expect(wrapper.emitted('close')).toBeFalsy();
    document.querySelector<HTMLElement>('button[aria-label]')!.click();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('locks page scroll while open and restores it on close', async () => {
    const wrapper = await mountModal(UiModal, {
      props: { show: true, title: 'Dialog' },
    });
    expect(document.documentElement.style.overflow).toBe('hidden');
    await wrapper.setProps({ show: false });
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('restores scroll on unmount while open', async () => {
    const wrapper = await mountModal(UiModal, {
      props: { show: true, title: 'Dialog' },
    });
    expect(document.documentElement.style.overflow).toBe('hidden');
    wrapper.unmount();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('keeps the lock until the last of two modals closes', async () => {
    const a = await mountModal(UiModal, { props: { show: true } });
    const b = await mountModal(UiModal, { props: { show: true } });
    a.unmount();
    expect(document.documentElement.style.overflow).toBe('hidden');
    b.unmount();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('as=form renders a form panel that emits submit', async () => {
    const wrapper = await mountModal(UiModal, {
      props: { show: true, title: 'Dialog', as: 'form' },
      slots: { default: () => h('input', { type: 'text' }) },
    });
    const panel = document.querySelector('[role="dialog"]')!;
    expect(panel.tagName).toBe('FORM');
    panel.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  // happy-dom has no layout, so offsetParent is always null; give rendered
  // elements one so the visibility filter in getFocusable keeps them.
  const withLayout = () =>
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return (this as HTMLElement).parentElement;
      },
    });

  it('focuses the first field on open, not the header close button', async () => {
    withLayout();
    const wrapper = await mountModal(UiModal, {
      props: { show: false, title: 'Form' },
      slots: { default: () => h('input', { id: 'first-field' }) },
    });
    await wrapper.setProps({ show: true });
    await nextTick();
    expect(document.activeElement?.id).toBe('first-field');
  });

  it('focuses the first footer action when the body has no field', async () => {
    withLayout();
    const wrapper = await mountModal(UiModal, {
      props: { show: false, title: 'Confirm' },
      slots: {
        default: () => h('p', 'Sure?'),
        footer: () => [
          h('button', { id: 'cancel' }, 'Cancel'),
          h('button', { id: 'ok' }, 'OK'),
        ],
      },
    });
    await wrapper.setProps({ show: true });
    await nextTick();
    expect(document.activeElement?.id).toBe('cancel');
  });

  it('is a bottom sheet on phones and a centred dialog from sm', async () => {
    await mountModal(UiModal, { props: { show: true, title: 'Sheet' } });
    const panel = document.querySelector('[role="dialog"]')!;
    expect(panel.parentElement!.className).toContain('items-end');
    expect(panel.parentElement!.className).toContain('sm:items-center');
    expect(panel.className).toContain('rounded-t-card');
    expect(panel.className).toContain('sm:rounded-card');
  });
});
