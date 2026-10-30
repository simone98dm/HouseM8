import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Checkbox from '~/components/ui/Checkbox.vue';

describe('UiCheckbox', () => {
  it('renders a native checkbox tied to its label', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { label: 'Remember me' },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect(wrapper.find('label').attributes('for')).toBe(
      input.attributes('id'),
    );
    expect(wrapper.text()).toContain('Remember me');
  });

  it('emits update:modelValue when toggled', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { modelValue: false },
    });
    await wrapper.find('input').setValue(true);
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true]);
  });

  it('forwards aria attrs to the input and class to the root', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { id: 'c' },
      attrs: { class: 'mt-4', 'aria-invalid': 'true', 'aria-describedby': 'x' },
    });
    const input = wrapper.find('input');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.attributes('aria-describedby')).toBe('x');
    expect(input.classes()).not.toContain('mt-4');
    expect(wrapper.classes()).toContain('mt-4');
  });

  it('links the hint slot via aria-describedby', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { id: 'c', label: 'Share' },
      attrs: { 'aria-describedby': 'err' },
      slots: { hint: 'Visible to housemates' },
    });
    expect(wrapper.find('#c-hint').text()).toBe('Visible to housemates');
    expect(wrapper.find('input').attributes('aria-describedby')).toBe(
      'c-hint err',
    );
  });

  it('disables the input', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { disabled: true, label: 'Off' },
    });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });
});
