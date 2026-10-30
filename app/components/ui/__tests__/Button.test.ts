import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UiButton from '~/components/ui/Button.vue';

describe('UiButton', () => {
  it('renders default slot content', async () => {
    const wrapper = await mountSuspended(UiButton, {
      slots: { default: 'Save' },
    });
    expect(wrapper.text()).toContain('Save');
  });

  it('renders primary variant by default', async () => {
    const wrapper = await mountSuspended(UiButton);
    expect(wrapper.find('button').attributes('class')).toContain('bg-brand');
  });

  it('renders secondary variant', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { variant: 'secondary' },
    });
    expect(wrapper.find('button').attributes('class')).toContain(
      'border-line-control',
    );
  });

  it('renders danger variant', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { variant: 'danger' },
    });
    expect(wrapper.find('button').attributes('class')).toContain('bg-danger');
  });

  it('renders ghost variant', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { variant: 'ghost' },
    });
    expect(wrapper.find('button').attributes('class')).toContain(
      'hover:bg-brand-subtle',
    );
  });

  it('renders outline primary', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { variant: 'primary', outline: true },
    });
    expect(wrapper.find('button').attributes('class')).toContain(
      'border-brand',
    );
  });

  it('renders sm size', async () => {
    const wrapper = await mountSuspended(UiButton, { props: { size: 'sm' } });
    expect(wrapper.find('button').attributes('class')).toContain('text-sm');
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'gives %s sm a 44px phone tap target, icon-only included',
    async (variant) => {
      const wrapper = await mountSuspended(UiButton, {
        props: { size: 'sm', variant },
      });
      const cls = wrapper.find('button').attributes('class');
      expect(cls).toContain('max-sm:min-h-11');
      expect(cls).toContain('max-sm:min-w-11');
    },
  );

  it('renders lg size', async () => {
    const wrapper = await mountSuspended(UiButton, { props: { size: 'lg' } });
    expect(wrapper.find('button').attributes('class')).toContain('text-base');
  });

  it('applies w-full when fullWidth is true', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { fullWidth: true },
    });
    expect(wrapper.find('button').attributes('class')).toContain('w-full');
  });

  it('is disabled when disabled prop is set', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { disabled: true },
    });
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('is aria-disabled, not natively disabled, when loading', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { loading: true },
    });
    const btn = wrapper.find('button');
    expect(btn.attributes('disabled')).toBeUndefined();
    expect(btn.attributes('aria-disabled')).toBe('true');
    expect(btn.attributes('aria-busy')).toBe('true');
  });

  it('does not emit click while loading', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { loading: true },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('keeps focus when loading flips true', async () => {
    const wrapper = await mountSuspended(UiButton, {
      attachTo: document.body,
    });
    const el = wrapper.find('button').element;
    el.focus();
    await wrapper.setProps({ loading: true });
    expect(document.activeElement).toBe(el);
    wrapper.unmount();
  });

  it('does not submit a form while loading', async () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    const form = document.createElement('form');
    form.addEventListener('submit', onSubmit);
    document.body.appendChild(form);
    const wrapper = await mountSuspended(UiButton, {
      props: { type: 'submit', loading: true },
      attachTo: form,
    });
    await wrapper.find('button').trigger('click');
    expect(onSubmit).not.toHaveBeenCalled();
    await wrapper.setProps({ loading: false });
    await wrapper.find('button').trigger('click');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    form.remove();
  });

  it('emits click event', async () => {
    const wrapper = await mountSuspended(UiButton);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('sets type attribute', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { type: 'submit' },
    });
    expect(wrapper.find('button').attributes('type')).toBe('submit');
  });

  it('uses the design-system shape and no legacy effects', async () => {
    const cls =
      (await mountSuspended(UiButton)).find('button').attributes('class') ?? '';
    expect(cls).toContain('rounded-control');
    expect(cls).toContain('focus-visible:outline-brand');
    for (const banned of [
      'rounded-full',
      'transition-all',
      'focus:ring',
      'active:scale',
      'shadow',
      'bg-linear',
    ])
      expect(cls).not.toContain(banned);
  });

  it('sets aria-busy only while loading', async () => {
    const busy = await mountSuspended(UiButton, { props: { loading: true } });
    expect(busy.find('button').attributes('aria-busy')).toBe('true');
    const idle = await mountSuspended(UiButton);
    expect(idle.find('button').attributes('aria-busy')).toBeUndefined();
  });

  it('keeps the label as sr-only text when succeeded', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { success: true },
      slots: { default: 'Save' },
    });
    const label = wrapper.find('span.sr-only');
    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('Save');
  });

  it('emits click with the native event', async () => {
    const wrapper = await mountSuspended(UiButton);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent);
  });

  it('has no `to` prop and always renders a button', async () => {
    const wrapper = await mountSuspended(UiButton);
    expect(wrapper.find('a').exists()).toBe(false);
    expect(UiButton.props?.to).toBeUndefined();
  });
});
