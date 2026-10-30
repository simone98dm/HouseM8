import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Switch from '~/components/ui/Switch.vue';

describe('UiSwitch', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: false },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows label when provided', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: false, label: 'Enable notifications' },
    });
    expect(wrapper.text()).toContain('Enable notifications');
  });

  it('emits update:modelValue true when toggled from false', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: false },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true]);
  });

  it('emits update:modelValue false when toggled from true', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: true },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('does not emit when disabled', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: false, disabled: true },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });
});

describe('UiSwitch label and motion', () => {
  it('uses a real label bound to the switch button', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: false, label: 'Active' },
    });
    const id = wrapper.find('button').attributes('id');
    expect(wrapper.find('label').attributes('for')).toBe(id);
  });

  it('has no overshoot easing', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { modelValue: true },
    });
    expect(wrapper.html()).not.toContain('cubic-bezier');
    expect(wrapper.html()).not.toContain('350');
  });
});
