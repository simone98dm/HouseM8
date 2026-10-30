/**
 * InvitationModal Component Tests — the "Invite someone" modal with its two
 * ways in: send by email, or share a code.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import InvitationModal from '~/components/house/InvitationModal.vue';
import { uiButtonStub } from '~/tests/utils';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
  locale: { value: 'en' },
}));

const CODE = { code: '482913', code_expires_at: '2026-10-28T10:00:00Z' };

const mounted: Array<{ unmount: () => void }> = [];
const mount = async (props: Record<string, unknown> = {}) => {
  const wrapper = await mountSuspended(InvitationModal, {
    props: { show: true, joinCode: CODE, ...props },
    global: {
      stubs: {
        Icon: true,
        UiButton: uiButtonStub,
        UiModal: {
          template: '<div v-if="show"><h2>{{ title }}</h2><slot /></div>',
          props: ['show', 'title'],
        },
      },
    },
  });
  mounted.push(wrapper);
  return wrapper;
};
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

describe('House InvitationModal', () => {
  it('titles itself "Invite someone" and explains when to use which option', async () => {
    const wrapper = await mount();
    expect(wrapper.find('h2').text()).toBe('houseProfile.invite.title');
    expect(wrapper.text()).toContain('houseProfile.invite.intro');
  });

  it('offers both options, with the join code inside', async () => {
    const wrapper = await mount();
    const headings = wrapper.findAll('h3').map((h) => h.text());
    expect(headings).toEqual([
      'houseProfile.invite.emailTitle',
      'houseProfile.joinCode.title',
    ]);
    expect(wrapper.text()).toContain('482913');
    expect(wrapper.text()).toContain('houseProfile.joinCode.explain');
  });

  it('emits invite-member with the trimmed email on submit', async () => {
    const wrapper = await mount();
    await wrapper.find('#house-invite-email').setValue('  a@b.co ');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('invite-member')).toEqual([['a@b.co']]);
  });

  it('does not emit for an empty email', async () => {
    const wrapper = await mount();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('invite-member')).toBeFalsy();
  });

  it('shows the action error as an alert', async () => {
    const wrapper = await mount({ actionError: 'Already a member' });
    expect(wrapper.find('[role="alert"]').text()).toContain('Already a member');
  });

  it('relays code generate and copy', async () => {
    const wrapper = await mount();
    const card = wrapper.findComponent({ name: 'HouseJoinCodeCard' });
    card.vm.$emit('generate');
    card.vm.$emit('copy');
    expect(wrapper.emitted('generate-code')).toHaveLength(1);
    expect(wrapper.emitted('copy-code')).toHaveLength(1);
  });

  it('renders nothing when closed', async () => {
    const wrapper = await mount({ show: false });
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
