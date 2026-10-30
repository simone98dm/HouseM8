import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ConsentCheckbox from '~/components/gdpr/ConsentCheckbox.vue';

const none = {
  age_confirmed: false,
  terms_accepted: false,
  privacy_acknowledged: false,
};

describe('ConsentCheckbox', () => {
  it('renders three separate aria-required, unticked checkboxes', async () => {
    const wrapper = await mountSuspended(ConsentCheckbox, {
      props: { modelValue: none },
    });
    const boxes = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]');
    expect(boxes).toHaveLength(3);
    for (const b of boxes) {
      expect(b.element.checked).toBe(false);
      expect(b.attributes('aria-required')).toBe('true');
    }
  });

  it('reflects the model', async () => {
    const wrapper = await mountSuspended(ConsentCheckbox, {
      props: { modelValue: { ...none, terms_accepted: true } },
    });
    expect(
      wrapper.find<HTMLInputElement>('#consent-terms').element.checked,
    ).toBe(true);
    expect(wrapper.find<HTMLInputElement>('#consent-age').element.checked).toBe(
      false,
    );
  });

  it('emits a new object with only the toggled key changed', async () => {
    const wrapper = await mountSuspended(ConsentCheckbox, {
      props: { modelValue: none },
    });
    await wrapper.find('#consent-age').setValue(true);
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([
      { ...none, age_confirmed: true },
    ]);
  });

  it('honours idPrefix and labels every input', async () => {
    const wrapper = await mountSuspended(ConsentCheckbox, {
      props: { modelValue: none, idPrefix: 'signup' },
    });
    for (const k of ['age', 'terms', 'privacy']) {
      expect(wrapper.find(`#signup-${k}`).exists()).toBe(true);
      expect(wrapper.find(`label[for="signup-${k}"]`).exists()).toBe(true);
    }
    expect(wrapper.find('#signup-privacy').attributes('aria-describedby')).toBe(
      'signup-privacy-hint',
    );
  });

  it('links the Terms and Privacy labels to /terms and /privacy in a new tab', async () => {
    const wrapper = await mountSuspended(ConsentCheckbox, {
      props: { modelValue: none },
    });
    const terms = wrapper.find('label[for="consent-terms"] a');
    const privacy = wrapper.find('label[for="consent-privacy"] a');
    expect(terms.attributes('href')).toBe('/terms');
    expect(privacy.attributes('href')).toBe('/privacy');
    expect(terms.attributes('target')).toBe('_blank');
    expect(privacy.attributes('target')).toBe('_blank');
  });
});
