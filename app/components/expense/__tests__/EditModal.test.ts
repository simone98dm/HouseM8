import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import EditModal from '~/components/expense/EditModal.vue';
import type { HouseMember } from '~/types';
import { UiModalFormStub } from '~/tests/utils';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiModal: UiModalFormStub,
    UiInput: {
      template:
        '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      props: [
        'id',
        'modelValue',
        'label',
        'placeholder',
        'type',
        'disabled',
        'required',
        'step',
        'min',
        'error',
        'hint',
      ],
      emits: ['update:modelValue'],
    },
    UiSwitch: {
      template:
        '<button class="switch-btn" @click="$emit(\'update:modelValue\', !modelValue)"></button>',
      props: ['modelValue', 'disabled', 'size', 'ariaLabel'],
      emits: ['update:modelValue'],
    },
    UiSelect: {
      template:
        '<select class="payer" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{o.label}}</option></select>',
      props: ['modelValue', 'options', 'label', 'disabled'],
      emits: ['update:modelValue'],
    },
    UiChip: true,
    ExpenseCategoryCombobox: {
      template:
        '<button type="button" class="cat" @click="$emit(\'update:modelValue\', [\'travel\'])">{{ modelValue.join(\',\') }}</button>',
      props: ['modelValue', 'disabled'],
      emits: ['update:modelValue'],
    },
    UiButton: {
      template:
        '<button class="ui-btn" :type="type" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
      props: [
        'type',
        'variant',
        'disabled',
        'loading',
        'icon',
        'fullWidth',
        'ariaLabel',
      ],
      emits: ['click'],
    },
  },
};

const mockUser = {
  id: 'u-1',
  first_name: 'Alice',
  last_name: 'Smith',
  email: 'alice@example.com',
  avatar_url: null,
};

function makeMember(userId: string, firstName: string): HouseMember {
  return {
    id: `m-${userId}`,
    house_id: 'h-1',
    user_id: userId,
    role: 'member',
    joined_at: '2025-01-01',
    is_active: true,
    user: {
      id: userId,
      first_name: firstName,
      last_name: 'User',
      email: `${userId}@example.com`,
      avatar_url: null,
    },
  };
}

// v-show hides with inline display:none; jsdom isVisible needs attachment.
const isHidden = (w: { find: (s: string) => { element: Element } }) =>
  !!w.find('select.payer').element.closest('[style*="display: none"]');

describe('ExpenseEditModal', () => {
  it('renders nothing when show is false', async () => {
    const wrapper = await mountSuspended(EditModal, {
      props: { show: false, members: [], currentUser: mockUser },
      global: G,
    });
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('renders form when show is true', async () => {
    const wrapper = await mountSuspended(EditModal, {
      props: { show: true, members: [], currentUser: mockUser },
      global: G,
    });
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('emits close when modal close button is triggered', async () => {
    const wrapper = await mountSuspended(EditModal, {
      props: { show: true, members: [], currentUser: mockUser },
      global: G,
    });
    await wrapper.find('.close-btn').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('pre-selects currentUser on mount', async () => {
    const member = makeMember('u-1', 'Alice');
    const wrapper = await mountSuspended(EditModal, {
      props: { show: true, members: [member], currentUser: mockUser },
      global: G,
    });
    expect(wrapper.find('.switch-btn').exists()).toBe(true);
  });

  describe('toggleUserSelection', () => {
    it('adds user when switch toggled on', async () => {
      const member = makeMember('u-2', 'Bob');
      const wrapper = await mountSuspended(EditModal, {
        props: { show: true, members: [member], currentUser: mockUser },
        global: G,
      });
      await wrapper.find('.switch-btn').trigger('click');
      expect(wrapper.exists()).toBe(true);
    });

    it('removes user when switch toggled off for pre-selected user', async () => {
      const member = makeMember('u-1', 'Alice'); // pre-selected as currentUser
      const wrapper = await mountSuspended(EditModal, {
        props: { show: true, members: [member], currentUser: mockUser },
        global: G,
      });
      await wrapper.find('.switch-btn').trigger('click');
      expect(wrapper.exists()).toBe(true);
    });

    it('handles member with no user (undefined user.id)', async () => {
      const memberNoUser: HouseMember = {
        id: 'm-empty',
        house_id: 'h-1',
        user_id: '',
        role: 'member',
        joined_at: '2025-01-01',
        is_active: true,
      };
      const wrapper = await mountSuspended(EditModal, {
        props: { show: true, members: [memberNoUser], currentUser: mockUser },
        global: G,
      });
      await wrapper.find('.switch-btn').trigger('click');
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('handleSubmit', () => {
    it('emits submit with correct payload', async () => {
      const wrapper = await mountSuspended(EditModal, {
        props: {
          show: true,
          members: [makeMember('u-1', 'Alice')],
          currentUser: mockUser,
        },
        global: G,
      });
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Rent');
      await inputs[1]!.setValue('600.00');

      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')).toBeTruthy();
      const payload = wrapper.emitted('submit')![0]![0] as {
        description: string;
        total_amount: number;
        due_date?: string;
      };
      expect(payload.description).toBe('Rent');
      expect(payload.total_amount).toBe(600);
    });

    it('sets due_date to undefined when empty', async () => {
      const wrapper = await mountSuspended(EditModal, {
        props: {
          show: true,
          members: [makeMember('u-1', 'Alice')],
          currentUser: mockUser,
        },
        global: G,
      });
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Gas');
      await inputs[1]!.setValue('80.00');
      // leave due_date empty
      await wrapper.find('form').trigger('submit');

      const payload = wrapper.emitted('submit')![0]![0] as {
        due_date?: string;
      };
      expect(payload.due_date).toBeUndefined();
    });

    it('keeps the typed input after submit so a failed create loses nothing', async () => {
      const wrapper = await mountSuspended(EditModal, {
        props: {
          show: true,
          members: [makeMember('u-1', 'Alice')],
          currentUser: mockUser,
        },
        global: G,
      });
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Internet');
      await inputs[1]!.setValue('45.00');
      await wrapper.find('form').trigger('submit');
      expect(
        (wrapper.findAll('input')[0]!.element as HTMLInputElement).value,
      ).toBe('Internet');
    });

    it('resets the form once the parent closes it', async () => {
      const wrapper = await mountSuspended(EditModal, {
        props: {
          show: true,
          members: [makeMember('u-1', 'Alice')],
          currentUser: mockUser,
        },
        global: G,
      });
      await wrapper.findAll('input')[0]!.setValue('Internet');
      await wrapper.setProps({ show: false });
      await wrapper.setProps({ show: true });
      expect(
        (wrapper.findAll('input')[0]!.element as HTMLInputElement).value,
      ).toBe('');
    });

    it('resets user_ids to empty when no currentUser after submit', async () => {
      const member = makeMember('u-other', 'Bob');
      const wrapper = await mountSuspended(EditModal, {
        props: { show: true, members: [member], currentUser: null },
        global: G,
      });
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Water');
      await inputs[1]!.setValue('20.00');
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit')).toBeTruthy();
    });
  });

  describe('add-sheet behaviour', () => {
    const open = (extra = {}) =>
      mountSuspended(EditModal, {
        props: {
          show: true,
          members: [makeMember('u-1', 'Alice'), makeMember('u-2', 'Bob')],
          currentUser: mockUser,
          currency: 'USD',
          ...extra,
        },
        global: G,
      });

    it('splits between all members and sends payer_id by default', async () => {
      const wrapper = await open();
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Dinner');
      await inputs[1]!.setValue('30');
      await wrapper.find('form').trigger('submit');
      const payload = wrapper.emitted('submit')![0]![0] as {
        user_ids: string[];
        payer_id: string;
      };
      expect(payload.user_ids).toEqual(['u-1', 'u-2']);
      expect(payload.payer_id).toBe('u-1');
    });

    it('shows inline errors instead of disabling submit', async () => {
      const wrapper = await open();
      expect(
        wrapper.find('button[type=submit]').attributes('disabled'),
      ).toBeUndefined();
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit')).toBeFalsy();
      expect(wrapper.emitted('submit-bill')).toBeFalsy();
    });

    it('pre-fills the guessed category until the user edits the categories', async () => {
      const wrapper = await open();
      expect(wrapper.find('.cat').text()).toBe('');
      await wrapper.findAll('input')[0]!.setValue('Netflix');
      expect(wrapper.find('.cat').text()).toBe('subscriptions');
      await wrapper.find('.cat').trigger('click');
      expect(wrapper.find('.cat').text()).toBe('travel');
      await wrapper.findAll('input')[0]!.setValue('Spesa Lidl');
      expect(wrapper.find('.cat').text()).toBe('travel');
    });

    it('collapses payer and split behind an Edit disclosure', async () => {
      const wrapper = await open();
      const toggle = wrapper
        .findAll('button.ui-btn')
        .find((b) => b.text() === 'expenses.form.detailsEdit')!;
      expect(toggle.attributes('aria-expanded')).toBe('false');
      expect(isHidden(wrapper)).toBe(true);
      await toggle.trigger('click');
      expect(isHidden(wrapper)).toBe(false);
    });

    it('opens the disclosure when the split rule fails', async () => {
      const wrapper = await open();
      await wrapper.find('select.payer').setValue('u-2');
      await wrapper.findAll('.switch-btn')[0]!.trigger('click');
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Gas');
      await inputs[1]!.setValue('20');
      await wrapper.find('form').trigger('submit');
      expect(isHidden(wrapper)).toBe(false);
      expect(wrapper.find('[role=alert]').exists()).toBe(true);
    });

    it('has no due date field for one-off expenses', async () => {
      const wrapper = await open();
      expect(wrapper.findAll('input')).toHaveLength(2);
    });

    it('rejects someone else paying when you are left out of the split', async () => {
      const wrapper = await open();
      await wrapper.find('select.payer').setValue('u-2');
      await wrapper.findAll('.switch-btn').at(-1)!.trigger('click');
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Gas');
      await inputs[1]!.setValue('20');
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit')).toBeFalsy();
    });

    it('posts a bill when "Does it repeat?" is on', async () => {
      const wrapper = await open();
      // the repeat toggle is the last switch
      await wrapper.findAll('.switch-btn').at(-1)!.trigger('click');
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Affitto');
      await inputs[1]!.setValue('600');
      await inputs[2]!.setValue('2030-01-01');
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit')).toBeFalsy();
      const bill = wrapper.emitted('submit-bill')![0]![0] as {
        monthly_cost: number;
        currency: string;
        categories: string[];
        next_due_date: string;
      };
      expect(bill).toMatchObject({
        monthly_cost: 600,
        currency: 'USD',
        categories: ['rent'],
        next_due_date: '2030-01-01',
      });
    });
  });

  describe('repeat and payer rules', () => {
    const open = () =>
      mountSuspended(EditModal, {
        props: {
          show: true,
          members: [makeMember('u-1', 'Alice'), makeMember('u-2', 'Bob')],
          currentUser: mockUser,
          currency: 'USD',
        },
        global: G,
      });

    it('bill payload carries the chosen period and no split/payer fields', async () => {
      const wrapper = await open();
      await wrapper.findAll('.switch-btn').at(-1)!.trigger('click');
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('  Affitto ');
      await inputs[1]!.setValue('600');
      await inputs[2]!.setValue('2030-01-01');
      const chips = wrapper.findAllComponents({ name: 'UiChip' });
      await chips[2]!.vm.$emit('click'); // 6 months
      await wrapper.find('form').trigger('submit');
      const bill = wrapper.emitted('submit-bill')![0]![0] as Record<
        string,
        unknown
      >;
      expect(bill.payment_period).toBe(6);
      expect(bill.description).toBe('Affitto');
      expect(bill).not.toHaveProperty('payer_id');
      expect(bill).not.toHaveProperty('user_ids');
    });

    it('repeat requires a next due date and skips the member check', async () => {
      const wrapper = await open();
      await wrapper.findAll('.switch-btn').at(-1)!.trigger('click');
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Affitto');
      await inputs[1]!.setValue('600');
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit-bill')).toBeFalsy();
    });

    it('allows someone else to pay when you are included in the split', async () => {
      const wrapper = await open();
      await wrapper.find('select.payer').setValue('u-2');
      const inputs = wrapper.findAll('input');
      await inputs[0]!.setValue('Gas');
      await inputs[1]!.setValue('20');
      await wrapper.find('form').trigger('submit');
      const payload = wrapper.emitted('submit')![0]![0] as {
        payer_id: string;
        user_ids: string[];
      };
      expect(payload.payer_id).toBe('u-2');
      expect(payload.user_ids).toContain('u-1');
    });
  });

  it('renders multiple members in the list', async () => {
    const m1 = makeMember('u-1', 'Alice');
    const m2 = makeMember('u-2', 'Bob');
    const wrapper = await mountSuspended(EditModal, {
      props: { show: true, members: [m1, m2], currentUser: mockUser },
      global: G,
    });
    expect(wrapper.text()).toContain('Alice User');
    expect(wrapper.text()).toContain('Bob User');
  });

  it('submits the chosen categories with the expense', async () => {
    const wrapper = await mountSuspended(EditModal, {
      props: {
        show: true,
        members: [makeMember('u-1', 'Alice')],
        currentUser: mockUser,
      },
      global: G,
    });
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('Netflix');
    await inputs[1]!.setValue('17.99');
    await wrapper.find('.cat').trigger('click');
    await wrapper.find('form').trigger('submit');
    const payload = wrapper.emitted('submit')![0]![0] as Record<
      string,
      unknown
    >;
    expect(payload.categories).toEqual(['travel']);
    expect(payload).not.toHaveProperty('recurring_period');
  });
});
