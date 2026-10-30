import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import CreateModal from '~/components/report/CreateModal.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiModal: {
      template:
        '<div v-if="show"><slot /><button class="close-btn" @click="$emit(\'close\')">X</button></div>',
      props: ['show', 'title', 'maxWidth'],
      emits: ['close'],
    },
    ReportForm: {
      template: '<div class="report-form" />',
      setup() {
        const resetForm = () => {};
        return { resetForm };
      },
    },
  },
};

const mockHouse = {
  id: 'h-1',
  name: 'My House',
  address: '1 Main St',
  owner_id: 'u-1',
  created_at: '',
  updated_at: '',
  currency: 'EUR',
  member_count: 1,
  members: [],
  invitations: [],
  status: 'active' as const,
};

describe('ReportCreateModal', () => {
  it('renders nothing when show is false', async () => {
    const wrapper = await mountSuspended(CreateModal, {
      props: { show: false, house: mockHouse },
      global: G,
    });
    expect(wrapper.find('.report-form').exists()).toBe(false);
  });

  it('renders ReportForm when show is true', async () => {
    const wrapper = await mountSuspended(CreateModal, {
      props: { show: true, house: mockHouse },
      global: G,
    });
    expect(wrapper.find('.report-form').exists()).toBe(true);
  });

  it('emits close', async () => {
    const wrapper = await mountSuspended(CreateModal, {
      props: { show: true, house: mockHouse },
      global: G,
    });
    wrapper.vm.$emit('close');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not emit submit when house has no id', async () => {
    const wrapper = await mountSuspended(CreateModal, {
      props: { show: true, house: null },
      global: G,
    });
    (wrapper.vm as any).handleSubmit({ description: 'Test', images: [] });
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('emits submit with correct payload when house has id', async () => {
    const wrapper = await mountSuspended(CreateModal, {
      props: { show: true, house: mockHouse },
      global: G,
    });
    (wrapper.vm as any).handleSubmit({
      description: 'Report desc',
      images: [],
    });
    expect(wrapper.emitted('submit')).toBeTruthy();
    const payload = wrapper.emitted('submit')![0][0] as {
      house_id: string;
      description: string;
    };
    expect(payload.house_id).toBe('h-1');
    expect(payload.description).toBe('Report desc');
  });

  it('handleClose emits close event', async () => {
    const wrapper = await mountSuspended(CreateModal, {
      props: { show: true, house: mockHouse },
      global: G,
    });
    (wrapper.vm as any).handleClose();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
