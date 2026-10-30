import { describe, it, expect, vi } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import AccountSetupWizard from '~/components/user/AccountSetupWizard.vue';

mockNuxtImport('useUserApi', () => () => ({ redeemInviteCode: vi.fn() }));
mockNuxtImport('useHousesStore', () => () => ({ loadHouse: vi.fn() }));
// Email sign-up (no name yet): the wizard opens on the name step.
mockNuxtImport('useUserStore', () => () => ({
  currentUser: { id: 'u-1', email: 'a@b.c', first_name: null },
}));
mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const stubs = {
  UiWizard: { template: '<div><slot :step="0" /></div>' },
  UiWizardStep: { template: '<div><slot /></div>' },
};

describe('AccountSetupWizard avatar preview', () => {
  it('draws the Blobatar from the name as it is typed', async () => {
    const wrapper = await mountSuspended(AccountSetupWizard, {
      global: { stubs },
    });
    const preview = () =>
      wrapper.find('[aria-label="onboarding.wizard.step1.avatarPreview"] img');

    const before = preview().attributes('src');
    await wrapper.find('#wizard-first-name').setValue('Ada');
    const afterFirst = preview().attributes('src');
    await wrapper.find('#wizard-last-name').setValue('Lovelace');
    const afterLast = preview().attributes('src');

    expect(before).toMatch(/^data:image\/svg\+xml/);
    expect(afterFirst).not.toBe(before);
    expect(afterLast).not.toBe(afterFirst);
  });
});
