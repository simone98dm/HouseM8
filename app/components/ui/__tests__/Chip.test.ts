import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UiChip from '~/components/ui/Chip.vue';

describe('UiChip', () => {
  it('renders label', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Active' },
    });
    expect(wrapper.text()).toContain('Active');
  });

  it('renders default variant classes', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag' },
    });
    expect(wrapper.attributes('class')).toContain('bg-surface-hover');
  });

  it('renders primary variant', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', variant: 'primary' },
    });
    expect(wrapper.attributes('class')).toContain('bg-brand-subtle');
  });

  it('renders success variant', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'OK', variant: 'success' },
    });
    expect(wrapper.attributes('class')).toContain('bg-ok-subtle');
  });

  it('renders danger variant', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Error', variant: 'danger' },
    });
    expect(wrapper.attributes('class')).toContain('bg-danger-subtle');
  });

  it('renders selected state', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', selected: true },
    });
    expect(wrapper.attributes('class')).toContain('border-line-control');
  });

  it('renders sm size', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', size: 'sm' },
    });
    expect(wrapper.attributes('class')).toContain('text-xs');
  });

  it('renders lg size', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', size: 'lg' },
    });
    expect(wrapper.attributes('class')).toContain('text-base');
  });

  it('emits click when selectable', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', selectable: true },
    });
    expect(wrapper.element.tagName).toBe('BUTTON');
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not emit click when not selectable', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', selectable: false },
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('renders remove button when removable', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', removable: true },
    });
    const btn = wrapper.find('button');
    expect(btn.exists()).toBe(true);
    expect(btn.attributes('type')).toBe('button');
    expect(btn.attributes('aria-label')).toBeTruthy();
  });

  it('emits remove when remove button clicked', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', removable: true },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('remove')).toBeTruthy();
  });

  it('never renders a nested button inside a selectable chip', async () => {
    const wrapper = await mountSuspended(UiChip, {
      props: { label: 'Tag', selectable: true },
    });
    expect(wrapper.find('button button').exists()).toBe(false);
    expect(wrapper.findAll('button')).toHaveLength(1);
  });
});
