import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import BulletinModal from '~/components/bulletin/Modal.vue';
import { UiModalFormStub } from '~/tests/utils';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiModal: UiModalFormStub },
};

const mountModal = () =>
  mountSuspended(BulletinModal, { props: { show: true }, global: G });

describe('BulletinModal', () => {
  it('renders nothing when show is false', async () => {
    const wrapper = await mountSuspended(BulletinModal, {
      props: { show: false },
      global: G,
    });
    expect(wrapper.find('textarea').exists()).toBe(false);
  });

  it('renders a message textarea and a date input', async () => {
    const wrapper = await mountModal();
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('input[type="date"]').exists()).toBe(true);
  });

  it('emits close from the footer Cancel', async () => {
    const wrapper = await mountModal();
    const cancel = wrapper
      .findAll('footer button')
      .find((b) => b.text() === 'bulletin.modal.cancel');
    await cancel!.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it.each(['', '   '])(
    'shows an inline error instead of emitting for message %j',
    async (message) => {
      const wrapper = await mountModal();
      await wrapper.find('textarea').setValue(message);
      await wrapper.find('form').trigger('submit');
      expect(wrapper.emitted('submit')).toBeFalsy();
      expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true');
      expect(wrapper.text()).toContain('bulletin.modal.errors.message');
    },
  );

  it('emits the trimmed message, without dismiss_date when empty', async () => {
    const wrapper = await mountModal();
    await wrapper.find('textarea').setValue('  Hello house  ');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')![0]![0]).toEqual({
      message: 'Hello house',
    });
  });

  it('includes dismiss_date when a date is picked', async () => {
    const wrapper = await mountModal();
    await wrapper.find('textarea').setValue('Note');
    await wrapper.find('input[type="date"]').setValue('2099-12-31');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')![0]![0]).toEqual({
      message: 'Note',
      dismiss_date: '2099-12-31',
    });
  });

  it('resets when closed', async () => {
    const wrapper = await mountModal();
    await wrapper.find('textarea').setValue('Draft');
    await wrapper.setProps({ show: false });
    await wrapper.setProps({ show: true });
    expect(
      (wrapper.find('textarea').element as HTMLTextAreaElement).value,
    ).toBe('');
  });
});
