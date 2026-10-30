import { describe, it, expect, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import PersonalInfoForm from '~/components/user/profile/PersonalInfoForm.vue';
import { createMockUser } from '~/tests/utils';

const G = { stubs: { Icon: true } };
const consent = {
  id: 'c',
  purpose: 'profile_sharing' as const,
  version: 2,
  granted_at: '2026-10-26T00:00:00Z',
  withdrawn_at: null,
};

const mount = (user = createMockUser(), isSaving = false) =>
  mountSuspended(PersonalInfoForm, { props: { user, isSaving }, global: G });

const clickSave = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
  await wrapper.findAll('button').at(-1)!.trigger('click');
  return (wrapper.emitted('save')![0] as [Record<string, unknown>])[0];
};

describe('PersonalInfoForm with profile-sharing consent', () => {
  beforeEach(() => {
    useConsentsStore().consents = [consent];
  });

  it('shows the optional fields and the manage-consent link instead of the opt-in', async () => {
    const wrapper = await mount();
    expect(wrapper.find('#profile-sharing-optin').exists()).toBe(false);
    expect(wrapper.find('#gender').exists()).toBe(true);
    expect(wrapper.find('#occupation_type').exists()).toBe(true);
  });

  it('sends optional fields, joining pets into a clean string', async () => {
    const user = createMockUser({
      gender: 'female',
      pets: ' cat , ,dog ',
      telephone: '123',
      instagram: '@a',
      twitter: '@b',
      linkedin: 'l',
      tiktok: '@t',
      languages: ['it'],
      occupation_type: 'student',
      study_field: 'law',
    });
    const payload = await clickSave(await mount(user));
    expect(payload).toMatchObject({
      gender: 'female',
      pets: 'cat, dog',
      telephone: '123',
      instagram: '@a',
      twitter: '@b',
      linkedin: 'l',
      tiktok: '@t',
      languages: ['it'],
      occupation_type: 'student',
      study_field: 'law',
    });
  });

  it('includes job_title for workers and omits empty optionals', async () => {
    const user = createMockUser({
      occupation_type: 'worker',
      job_title: 'dev',
      pets: '',
      gender: undefined,
      languages: [],
    } as never);
    const payload = await clickSave(await mount(user));
    expect(payload.job_title).toBe('dev');
    expect(payload.pets).toBeUndefined();
    expect(payload.languages).toBeUndefined();
  });

  it('only sends changed, non-blank names and never the email', async () => {
    const user = createMockUser({ first_name: 'Ann', last_name: 'Lee' });
    const wrapper = await mount(user);
    await wrapper.find('#first_name').setValue('  Bob ');
    await wrapper.find('#last_name').setValue('   ');
    const payload = await clickSave(wrapper);
    expect(payload.first_name).toBe('Bob');
    expect(payload.last_name).toBeUndefined();
    expect(payload.email).toBeUndefined();
  });

  it('emits cancel and marks Save busy while saving', async () => {
    const wrapper = await mount(createMockUser(), true);
    const buttons = wrapper.findAll('button');
    // Saving shows busy state on Save (aria-busy), never native disabled.
    expect(buttons.at(-1)!.attributes('aria-busy')).toBe('true');
    const idle = await mount();
    await idle.findAll('button').at(-2)!.trigger('click');
    expect(idle.emitted('cancel')).toHaveLength(1);
  });
});
