import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import Form from '~/components/report/Form.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiButton: true },
};

// happy-dom doesn't implement the Blob URL APIs.
beforeEach(() => {
  let counter = 0;
  global.URL.createObjectURL = vi.fn(() => `blob:mock-url-${counter++}`);
  global.URL.revokeObjectURL = vi.fn();
});

describe('ReportForm', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(Form, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows houseName when provided', async () => {
    const wrapper = await mountSuspended(Form, {
      props: { houseName: 'Ocean View' },
      global: G,
    });
    expect(wrapper.text()).toContain('Ocean View');
  });

  it('shows description textarea', async () => {
    const wrapper = await mountSuspended(Form, { global: G });
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('emits cancel when cancel button clicked', async () => {
    const wrapper = await mountSuspended(Form, { global: G });
    await wrapper.findAllComponents({ name: 'UiButton' })[0]?.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('revokes the object URL for a removed thumbnail without dropping the others', async () => {
    const wrapper = await mountSuspended(Form, { global: G });
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });

    await wrapper
      .findComponent({ name: 'UiUploadDocument' })
      .vm.$emit('upload', [fileA, fileB]);

    expect(wrapper.findAll('img')).toHaveLength(2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

    // Remove the first (mid-queue relative to a 3-item list) thumbnail by its
    // stable file-identity key, not by array index.
    await wrapper
      .findAll('img')[0]
      ?.element.parentElement?.querySelector('button')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-0');
    // The remaining thumbnail is still fileB's own URL, not misaligned.
    expect(wrapper.findAll('img')).toHaveLength(1);
    expect(wrapper.find('img').attributes('alt')).toBe('b.png');
  });

  it('revokes all remaining object URLs on unmount', async () => {
    const wrapper = await mountSuspended(Form, { global: G });
    const file = new File(['a'], 'a.png', { type: 'image/png' });

    await wrapper
      .findComponent({ name: 'UiUploadDocument' })
      .vm.$emit('upload', [file]);

    wrapper.unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-0');
  });
});
