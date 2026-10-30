/**
 * MembersCard Component Tests
 *
 * Real mounts via mountSuspended — this file previously only asserted on
 * locally-declared constants without ever rendering the component. Covers:
 * per-member overflow menu (remove / change role) authorization, the
 * confirm-before-delete step, the "Invite someone" entry point, and the role
 * change flow.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import MembersCard from '~/components/house/MembersCard.vue';
import type { HouseMember } from '~/types';

mockNuxtImport('useI18n', () => () => ({
  // Encode interpolation params into the returned string so tests can
  // assert on them (e.g. which member name a confirm dialog names)
  // without depending on real translated copy.
  t: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${JSON.stringify(params)}` : key,
  locale: { value: 'en' },
}));

const G = {
  stubs: {
    Icon: true,
    UiUserAvatar: {
      template: '<div class="avatar" />',
      props: ['size', 'user'],
    },
    UiButton: {
      template:
        '<button class="ui-btn" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
      props: ['variant', 'size', 'loading', 'disabled'],
      emits: ['click'],
    },
    UiConfirmModal: {
      template:
        '<div v-if="show" class="confirm-modal" :data-variant="confirmVariant"><p class="confirm-modal-title">{{ title }}</p><p class="confirm-modal-message">{{ message }}</p><slot /><button class="confirm-modal-confirm" @click="$emit(\'confirm\')">{{ confirmText }}</button><button class="confirm-modal-cancel" @click="$emit(\'cancel\')">{{ cancelText }}</button></div>',
      props: [
        'show',
        'title',
        'message',
        'confirmText',
        'cancelText',
        'loading',
        'confirmVariant',
      ],
      emits: ['confirm', 'cancel', 'close'],
    },
  },
};

const owner: HouseMember = {
  id: 'member-1',
  user_id: 'user-1',
  house_id: 'house-123',
  role: 'owner',
  is_active: true,
  joined_at: '2025-01-01T00:00:00Z',
  user: {
    id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    created_at: '2025-01-01',
  },
};

const memberJane: HouseMember = {
  id: 'member-2',
  user_id: 'user-2',
  house_id: 'house-123',
  role: 'member',
  is_active: true,
  joined_at: '2025-01-15T00:00:00Z',
  user: {
    id: 'user-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    created_at: '2025-01-15',
  },
};

const memberBob: HouseMember = {
  id: 'member-3',
  user_id: 'user-3',
  house_id: 'house-123',
  role: 'member',
  is_active: true,
  joined_at: '2025-02-01T00:00:00Z',
  user: {
    id: 'user-3',
    first_name: 'Bob',
    last_name: 'Johnson',
    email: 'bob@example.com',
    created_at: '2025-02-01',
  },
};

const allMembers = [owner, memberJane, memberBob];

const mounted: Array<{ unmount: () => void }> = [];
const mount = async (props: Record<string, unknown> = {}) => {
  const wrapper = await mountSuspended(MembersCard, {
    props: { members: allMembers, ...props },
    global: G,
  });
  mounted.push(wrapper);
  return wrapper;
};

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount());
});

const ownerView = { isCurrentUserOwner: true, currentUserId: 'user-1' };

/** The per-row actions trigger for a member (icon-only, named by aria-label). */
const actionsTrigger = (
  wrapper: Awaited<ReturnType<typeof mount>>,
  name: string,
) =>
  wrapper
    .findAll('button')
    .find(
      (b) =>
        b.attributes('aria-label')?.includes('a11y.buttons.memberActions') &&
        b.attributes('aria-label')?.includes(name),
    );

// Menus are teleported to <body>, outside the wrapper's tree.
const menuItems = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
const clickItem = async (text: string) => {
  const item = menuItems().find((el) => el.textContent?.includes(text));
  expect(item).toBeDefined();
  item!.click();
  await nextTick();
  await nextTick();
};

describe('House MembersCard Component', () => {
  it('renders', async () => {
    const wrapper = await mount();
    expect(wrapper.exists()).toBe(true);
  });

  it('displays every member name', async () => {
    const wrapper = await mount();
    expect(wrapper.text()).toContain('John');
    expect(wrapper.text()).toContain('Jane');
    expect(wrapper.text()).toContain('Bob');
  });

  it('emits user-click with the member id when a row is clicked', async () => {
    const wrapper = await mount();
    const janeRow = wrapper
      .findAll('button')
      .find((r) => r.text().includes('Jane'));
    await janeRow?.trigger('click');
    expect(wrapper.emitted('user-click')?.[0]).toEqual(['user-2']);
  });

  describe('Per-member actions (authorization)', () => {
    it('hides every control for a non-owner viewer', async () => {
      const wrapper = await mount({
        isCurrentUserOwner: false,
        currentUserId: 'user-2',
      });
      expect(actionsTrigger(wrapper, 'Jane')).toBeUndefined();
      expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(false);
    });

    it("hides the controls on the current owner's own row", async () => {
      const wrapper = await mount(ownerView);
      expect(actionsTrigger(wrapper, 'John Doe')).toBeUndefined();
      expect(actionsTrigger(wrapper, 'Jane Smith')).toBeDefined();
      expect(actionsTrigger(wrapper, 'Bob Johnson')).toBeDefined();
    });

    it('shows one control per row: the actions menu, not a separate role menu', async () => {
      const wrapper = await mount(ownerView);
      expect(wrapper.findAll('[aria-haspopup="menu"]')).toHaveLength(2);
    });

    it('badges only the roles that differ from member, the owner first', async () => {
      const wrapper = await mount({ members: [memberJane, owner] });
      const rows = wrapper.findAll('li');
      expect(rows[0]!.text()).toContain('John');
      expect(rows[0]!.find('.badge').text()).toBe('houseProfile.roleOwner');
      // Housemates never see each other's email (CLAUDE.md).
      expect(rows[0]!.text()).not.toContain('john@example.com');
      expect(rows[0]!.text()).toContain('houseProfile.memberSince');
      expect(rows[1]!.find('.badge').exists()).toBe(false);
    });
  });

  describe('Remove from house (confirm-before-delete)', () => {
    const askToRemove = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
      await actionsTrigger(wrapper, 'Jane Smith')?.trigger('click');
      await clickItem('houseProfile.removeFromHouse');
    };

    it('labels the action and does not emit until confirmed', async () => {
      const wrapper = await mount(ownerView);
      await actionsTrigger(wrapper, 'Jane Smith')?.trigger('click');
      // The ordinary role change first, then the two that can't be undone.
      expect(menuItems().map((el) => el.textContent?.trim())).toEqual([
        expect.stringContaining(
          'houseProfile.changeRoleTo|{"role":"houseProfile.roleAdmin"}',
        ),
        expect.stringContaining('houseProfile.transferOwnershipAction'),
        'houseProfile.removeFromHouse',
      ]);
      await clickItem('houseProfile.removeFromHouse');

      expect(wrapper.emitted('remove-member')).toBeFalsy();
      const modal = wrapper.find('.confirm-modal');
      expect(modal.exists()).toBe(true);
      expect(modal.find('.confirm-modal-message').text()).toContain(
        'Jane Smith',
      );
    });

    it('uses a danger-styled confirm button', async () => {
      const wrapper = await mount(ownerView);
      await askToRemove(wrapper);
      expect(wrapper.find('.confirm-modal').attributes('data-variant')).toBe(
        'danger',
      );
    });

    it('emits remove-member with the correct user id once confirmed', async () => {
      const wrapper = await mount(ownerView);
      await askToRemove(wrapper);
      await wrapper.find('.confirm-modal-confirm').trigger('click');
      expect(wrapper.emitted('remove-member')?.[0]).toEqual(['user-2']);
    });

    it('does not emit remove-member when cancelled', async () => {
      const wrapper = await mount(ownerView);
      await askToRemove(wrapper);
      await wrapper.find('.confirm-modal-cancel').trigger('click');
      expect(wrapper.emitted('remove-member')).toBeFalsy();
      expect(wrapper.find('.confirm-modal').exists()).toBe(false);
    });
  });

  describe('Action error', () => {
    it('renders the action error as an alert', async () => {
      const wrapper = await mount({ actionError: 'User is already a member' });
      const alert = wrapper.find('[role="alert"]');
      expect(alert.exists()).toBe(true);
      expect(alert.text()).toContain('User is already a member');
    });

    it('renders no alert when there is no error', async () => {
      const wrapper = await mount({ actionError: null });
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });
  });

  describe('Role change', () => {
    const chooseRole = async (
      wrapper: Awaited<ReturnType<typeof mount>>,
      role: 'roleAdmin' | 'roleOwner',
    ) => {
      await actionsTrigger(wrapper, 'Jane Smith')?.trigger('click');
      await clickItem(
        role === 'roleOwner'
          ? 'houseProfile.transferOwnershipAction'
          : `"role":"houseProfile.${role}"`,
      );
    };

    it('does not emit until the change is confirmed', async () => {
      const wrapper = await mount(ownerView);
      await chooseRole(wrapper, 'roleAdmin');
      expect(wrapper.emitted('update-role')).toBeFalsy();
      const modal = wrapper.findComponent({ name: 'HouseRoleChangeModal' });
      expect(modal.props('newRole')).toBe('admin');
      modal.vm.$emit('confirm');
      await nextTick();
      expect(wrapper.emitted('update-role')).toEqual([['user-2', 'admin']]);
    });

    it('offers ownership as its own action and emits transfer-ownership on confirm', async () => {
      const wrapper = await mount(ownerView);
      await chooseRole(wrapper, 'roleOwner');

      const modal = wrapper.findComponent({ name: 'HouseRoleChangeModal' });
      expect(modal.props('newRole')).toBe('owner');
      modal.vm.$emit('confirm');
      await nextTick();

      expect(wrapper.emitted('transfer-ownership')).toEqual([['user-2']]);
      expect(wrapper.emitted('update-role')).toBeFalsy();
    });
  });

  describe('Money and errors around member actions', () => {
    const balances = [
      { user_id: 'user-2', net_balance: -32, total_paid: 0, total_owed: 32 },
      { user_id: 'user-3', net_balance: 0, total_paid: 0, total_owed: 0 },
    ];

    const removalNote = async (name: string) => {
      const wrapper = await mount({ ...ownerView, balances, currency: 'EUR' });
      await actionsTrigger(wrapper, name)?.trigger('click');
      await clickItem('houseProfile.removeFromHouse');
      return wrapper.find('.confirm-modal .state-card');
    };

    it('says what a member still owes before removing them', async () => {
      const note = await removalNote('Jane Smith');
      expect(note.text()).toContain('houseProfile.removeMemberOwes');
      expect(note.text()).toContain('Jane Smith');
    });

    it('adds no money note for someone who is square', async () => {
      expect((await removalNote('Bob Johnson')).exists()).toBe(false);
    });

    it('shows a failed action under the member it belongs to', async () => {
      const wrapper = await mount({
        ...ownerView,
        actionError: 'Could not remove',
        actionErrorUserId: 'user-3',
      });
      const rows = wrapper.findAll('li');
      expect(rows[2]!.find('[role="alert"]').text()).toBe('Could not remove');
      expect(rows[1]!.find('[role="alert"]').exists()).toBe(false);
    });
  });
});
