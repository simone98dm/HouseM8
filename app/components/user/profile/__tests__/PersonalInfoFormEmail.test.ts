import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import PersonalInfoForm from '~/components/user/profile/PersonalInfoForm.vue';
import { createMockUser } from '~/tests/utils';

describe('PersonalInfoForm email field', () => {
  it('renders the sign-in email as disabled and never emits it on save', async () => {
    const wrapper = await mountSuspended(PersonalInfoForm, {
      props: { user: createMockUser({ email: 'me@example.com' }) },
    });

    const input = wrapper.find('input#email');
    expect(input.exists()).toBe(true);
    expect(input.attributes('disabled')).toBeDefined();

    await wrapper.find('input#email').setValue('attacker@example.com');
    const buttons = wrapper.findAll('button');
    await buttons[buttons.length - 1]!.trigger('click');

    const saves = wrapper.emitted('save') ?? [];
    expect(saves.length).toBeGreaterThan(0);
    for (const [payload] of saves) {
      expect(payload).not.toHaveProperty('email');
    }
  });
});
