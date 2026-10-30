import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UiInput from '~/components/ui/Input.vue';

describe('UiInput', () => {
  it('renders an input element by default', () => {
    const wrapper = mount(UiInput);
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('renders textarea when type is textarea', () => {
    const wrapper = mount(UiInput, { props: { type: 'textarea' } });
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('renders label when provided', () => {
    const wrapper = mount(UiInput, { props: { label: 'Email address' } });
    expect(wrapper.text()).toContain('Email address');
  });

  it('renders hint when provided', () => {
    const wrapper = mount(UiInput, { props: { hint: 'Min 8 chars' } });
    expect(wrapper.text()).toContain('Min 8 chars');
  });

  it('binds modelValue to input', () => {
    const wrapper = mount(UiInput, { props: { modelValue: 'hello' } });
    expect(wrapper.find('input').element.value).toBe('hello');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(UiInput);
    await wrapper.find('input').setValue('new value');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('is disabled when disabled prop is set', () => {
    const wrapper = mount(UiInput, { props: { disabled: true } });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });

  it('sets placeholder attribute', () => {
    const wrapper = mount(UiInput, { props: { placeholder: 'Enter text...' } });
    expect(wrapper.find('input').attributes('placeholder')).toBe(
      'Enter text...',
    );
  });

  it('renders sm size classes', () => {
    const wrapper = mount(UiInput, { props: { size: 'sm' } });
    expect(wrapper.find('input').attributes('class')).toContain('text-sm');
  });

  it('renders lg size classes', () => {
    const wrapper = mount(UiInput, { props: { size: 'lg' } });
    expect(wrapper.find('input').attributes('class')).toContain('text-base');
  });

  it('renders required marker in label', () => {
    const wrapper = mount(UiInput, {
      props: { label: 'Name', required: true },
    });
    expect(wrapper.find('span').text()).toBe('*');
  });

  describe('leading icon', () => {
    it('renders the icon slot and clears room for it', () => {
      const wrapper = mount(UiInput, {
        slots: { icon: '<svg data-test="lead" />' },
      });
      expect(wrapper.find('[data-test="lead"]').exists()).toBe(true);
      expect(wrapper.find('input').attributes('class')).toContain('pl-10');
    });

    it('does not pad the input when no icon is passed', () => {
      const wrapper = mount(UiInput);
      expect(wrapper.find('input').attributes('class')).not.toContain('pl-10');
    });
  });

  describe('label-append slot', () => {
    it('renders alongside the label', () => {
      const wrapper = mount(UiInput, {
        props: { label: 'Password' },
        slots: { 'label-append': '<a href="/reset">Forgot?</a>' },
      });
      expect(wrapper.find('label').text()).toContain('Password');
      expect(wrapper.find('a').text()).toBe('Forgot?');
    });
  });

  describe('hint accessibility', () => {
    it('announces the hint only in the error state', () => {
      const plain = mount(UiInput, { props: { hint: 'Min 8 chars' } });
      expect(plain.find('p').attributes('role')).toBeUndefined();

      const invalid = mount(UiInput, {
        props: { hint: 'Too short', error: true },
      });
      expect(invalid.find('p').attributes('role')).toBe('alert');
    });

    it('keeps a caller-supplied aria-describedby alongside the hint id', () => {
      const wrapper = mount(UiInput, {
        props: { hint: 'Min 8 chars' },
        attrs: { 'aria-describedby': 'page-error' },
      });
      const describedBy = wrapper.find('input').attributes('aria-describedby');
      const hintId = wrapper.find('p').attributes('id');

      expect(describedBy).toContain('page-error');
      expect(describedBy).toContain(hintId);
    });

    it('passes a caller-supplied aria-describedby through when there is no hint', () => {
      const wrapper = mount(UiInput, {
        attrs: { 'aria-describedby': 'page-error' },
      });
      expect(wrapper.find('input').attributes('aria-describedby')).toBe(
        'page-error',
      );
    });
  });
});
