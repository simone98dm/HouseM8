import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import InfoField from '~/components/user/profile/InfoField.vue';

const G = { mocks: { $t: (k: string) => k }, stubs: { Icon: true } };

const baseProps = {
  icon: 'heroicons:cake',
  iconBgClass: 'bg-danger-subtle',
  iconColorClass: 'text-danger-fg',
  label: 'Birthdate',
  value: 'Jan 1, 1990',
};

describe('InfoField', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(InfoField, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the label and value', async () => {
    const wrapper = await mountSuspended(InfoField, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('Birthdate');
    expect(wrapper.text()).toContain('Jan 1, 1990');
  });

  it('applies the icon background and color classes', async () => {
    const wrapper = await mountSuspended(InfoField, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.html()).toContain('bg-danger-subtle');
    expect(wrapper.html()).toContain('text-danger-fg');
  });

  it('applies an optional valueClass to the default value paragraph', async () => {
    const wrapper = await mountSuspended(InfoField, {
      props: { ...baseProps, valueClass: 'capitalize' },
      global: G,
    });
    expect(wrapper.html()).toContain('capitalize');
  });

  it('renders slot content instead of the default value paragraph when provided', async () => {
    const wrapper = await mountSuspended(InfoField, {
      props: { ...baseProps, value: undefined },
      slots: { default: '<span class="chip">English</span>' },
      global: G,
    });
    expect(wrapper.find('.chip').exists()).toBe(true);
    expect(wrapper.text()).toContain('English');
  });

  it('defaults to an empty value when none is provided', async () => {
    const wrapper = await mountSuspended(InfoField, {
      props: {
        icon: baseProps.icon,
        iconBgClass: baseProps.iconBgClass,
        iconColorClass: baseProps.iconColorClass,
        label: 'Pets',
      },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });
});
