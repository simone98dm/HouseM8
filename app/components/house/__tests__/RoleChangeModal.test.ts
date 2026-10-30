import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import RoleChangeModal from '~/components/house/RoleChangeModal.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  locale: { value: 'en' },
}));

// UiModal teleports to body, so its content never lands inside the wrapper.
// Stubbed the same way the project's other modal tests do it — extended here
// to render the #footer slot, which this modal uses for its actions.
const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    UiModal: {
      template:
        '<div v-if="show" class="ui-modal"><slot /><slot name="footer" /></div>',
      props: ['show', 'title', 'maxWidth'],
      emits: ['close'],
    },
    UiButton: {
      template:
        '<button class="ui-btn" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
      props: ['variant', 'disabled', 'loading', 'ariaLabel'],
      emits: ['click'],
    },
    UiUserAvatar: {
      template: '<div class="avatar" />',
      props: ['size', 'user'],
    },
    Icon: { template: '<i :data-icon="name" />', props: ['name'] },
  },
};

const member = {
  user_id: 'u-2',
  role: 'member',
  user: { id: 'u-2', first_name: 'Simone', last_name: 'Local' },
} as never;

const mount = (props = {}) =>
  mountSuspended(RoleChangeModal, {
    props: { show: true, member, newRole: 'admin', ...props },
    global: G,
  });

describe('RoleChangeModal', () => {
  it('names the member whose role is changing', async () => {
    const wrapper = await mount();
    expect(wrapper.text()).toContain('Simone Local');
  });

  it('shows the role being left and the role being taken', async () => {
    const wrapper = await mount();
    expect(wrapper.text()).toContain('houseProfile.roleMember');
    expect(wrapper.text()).toContain('houseProfile.roleAdmin');
  });

  // The direction must survive without colour. Red/green alone carries the
  // meaning in hue only — a WCAG 1.4.1 failure and invisible to the most
  // common colour blindness. Strikethrough plus arrow encode it independently,
  // the way git uses -/+ rather than colour.
  it('does not rely on colour alone to convey the direction', async () => {
    const wrapper = await mount();
    const html = wrapper.html();

    expect(html).toContain('line-through');
    expect(html).toContain('heroicons:arrow-right');
  });

  // Sighted users read the diff row; screen readers get one sentence instead
  // of three disconnected fragments.
  it('exposes the whole change as a single announced sentence', async () => {
    const wrapper = await mount();
    expect(wrapper.find('.sr-only').text()).toContain(
      'houseProfile.roleChange.summary',
    );
  });

  it('emits confirm and cancel rather than acting on its own', async () => {
    const wrapper = await mount();
    const buttons = wrapper.findAll('button');

    const confirm = buttons.find((b) => b.text().includes('common.confirm'));
    const cancel = buttons.find((b) => b.text().includes('common.cancel'));

    await confirm?.trigger('click');
    await cancel?.trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('states what the new role will let the member do', async () => {
    const wrapper = await mount({ newRole: 'member' });
    expect(wrapper.text()).toContain('houseProfile.roleChange.effect.member');
  });

  it('warns that an ownership transfer is irreversible and uses a danger confirm', async () => {
    const wrapper = await mount({ newRole: 'owner' });

    expect(wrapper.find('[role="alert"]').text()).toContain(
      'houseProfile.roleChange.effect.owner',
    );
    expect(wrapper.text()).toContain('houseProfile.roleChange.transferConfirm');
  });
});
