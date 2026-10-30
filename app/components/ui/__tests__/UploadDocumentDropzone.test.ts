/**
 * UploadDocumentDropzone Component Tests
 * Covers the drag/drop + click-to-pick zone extracted from UploadDocument.vue.
 * The dropzone only emits raw File[] selections; it never validates itself.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UploadDocumentDropzone from '~/components/ui/UploadDocumentDropzone.vue';

function makeFile(name = 'doc.pdf') {
  return new File(['x'], name, { type: 'application/pdf' });
}

function dragEvent(type: string, files: File[] = []) {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  return event;
}

describe('UploadDocumentDropzone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the zone as a labelled, focusable button', async () => {
    const wrapper = await mountSuspended(UploadDocumentDropzone);
    const zone = wrapper.find('.upload-zone');
    expect(zone.attributes('role')).toBe('button');
    expect(zone.attributes('tabindex')).toBe('0');
    expect(zone.attributes('aria-label')).toBeTruthy();
  });

  it('is removed from tab order and aria-disabled when disabled', async () => {
    const wrapper = await mountSuspended(UploadDocumentDropzone, {
      props: { disabled: true },
    });
    const zone = wrapper.find('.upload-zone');
    expect(zone.attributes('tabindex')).toBe('-1');
    expect(zone.attributes('aria-disabled')).toBe('true');
  });

  it('uses no heading elements and no nested native buttons', async () => {
    const wrapper = await mountSuspended(UploadDocumentDropzone);
    expect(wrapper.find('h1,h2,h3,h4,h5,h6').exists()).toBe(false);
    expect(wrapper.findAll('button').length).toBe(0);
  });

  it.each(['Enter', ' '])(
    'opens the file picker on %j keydown',
    async (key) => {
      const clickSpy = vi
        .spyOn(HTMLInputElement.prototype, 'click')
        .mockImplementation(() => {});
      const wrapper = await mountSuspended(UploadDocumentDropzone);

      await wrapper.find('.upload-zone').trigger('keydown', { key });

      expect(clickSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('ignores other keys', async () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const wrapper = await mountSuspended(UploadDocumentDropzone);

    await wrapper.find('.upload-zone').trigger('keydown', { key: 'a' });

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('does not open the picker on click or Enter when disabled', async () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const wrapper = await mountSuspended(UploadDocumentDropzone, {
      props: { disabled: true },
    });

    await wrapper.find('.upload-zone').trigger('click');
    await wrapper.find('.upload-zone').trigger('keydown', { key: 'Enter' });

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('opens the picker when the zone is clicked', async () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const wrapper = await mountSuspended(UploadDocumentDropzone);

    await wrapper.find('.upload-zone').trigger('click');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  describe('drag state', () => {
    it('enters the dragging state on dragenter and shows the drop prompt', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone);
      const zone = wrapper.find('.upload-zone');
      const idleText = zone.text();

      zone.element.dispatchEvent(dragEvent('dragenter'));
      await wrapper.vm.$nextTick();

      expect(zone.classes()).toContain('border-brand');
      expect(zone.classes()).toContain('bg-brand-subtle');
      expect(zone.text()).not.toBe(idleText);
    });

    it('leaves the dragging state when the drag leaves the zone', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone);
      const zone = wrapper.find('.upload-zone');

      zone.element.dispatchEvent(dragEvent('dragenter'));
      await wrapper.vm.$nextTick();
      zone.element.dispatchEvent(dragEvent('dragleave'));
      await wrapper.vm.$nextTick();

      expect(zone.classes()).not.toContain('bg-brand-subtle');
    });

    it('clears the dragging state after a drop', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone);
      const zone = wrapper.find('.upload-zone');

      zone.element.dispatchEvent(dragEvent('dragenter'));
      zone.element.dispatchEvent(dragEvent('drop', [makeFile()]));
      await wrapper.vm.$nextTick();

      expect(zone.classes()).not.toContain('bg-brand-subtle');
    });

    it('does not enter the dragging state when disabled', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone, {
        props: { disabled: true },
      });
      const zone = wrapper.find('.upload-zone');

      zone.element.dispatchEvent(dragEvent('dragenter'));
      await wrapper.vm.$nextTick();

      expect(zone.classes()).not.toContain('bg-brand-subtle');
    });
  });

  describe('hints', () => {
    it('lists accepted types via Intl.ListFormat, upper-cased without dots', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone, {
        props: { accept: '.pdf, .png' },
      });
      const expected = new Intl.ListFormat('en', {
        style: 'narrow',
        type: 'unit',
      }).format(['PDF', 'PNG']);
      expect(wrapper.text()).toContain(expected);
    });

    it('formats the max size via Intl.NumberFormat as megabytes', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone, {
        props: { maxSize: 25 },
      });
      const expected = new Intl.NumberFormat('en', {
        style: 'unit',
        unit: 'megabyte',
      }).format(25);
      expect(wrapper.text()).toContain(expected);
    });

    it('shows the singular or plural instruction depending on multiple', async () => {
      const single = await mountSuspended(UploadDocumentDropzone);
      const multi = await mountSuspended(UploadDocumentDropzone, {
        props: { multiple: true },
      });
      expect(single.text()).not.toBe(multi.text());
      expect(
        multi.find('input[type="file"]').attributes('multiple'),
      ).toBeDefined();
      expect(
        single.find('input[type="file"]').attributes('multiple'),
      ).toBeUndefined();
    });
  });

  describe('selection', () => {
    it('emits filesSelected with the raw picked files, no validation', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone);
      const input = wrapper.find('input[type="file"]');
      Object.defineProperty(input.element, 'files', {
        value: [makeFile('anything.exe')],
        configurable: true,
      });
      await input.trigger('change');

      const [emittedFiles] = wrapper.emitted('filesSelected')![0] as [File[]];
      expect(emittedFiles[0]?.name).toBe('anything.exe');
    });

    it('emits filesSelected on drop', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone);
      wrapper
        .find('.upload-zone')
        .element.dispatchEvent(dragEvent('drop', [makeFile('dropped.pdf')]));
      await wrapper.vm.$nextTick();

      const [emittedFiles] = wrapper.emitted('filesSelected')![0] as [File[]];
      expect(emittedFiles[0]?.name).toBe('dropped.pdf');
    });

    it('does not emit on drop when disabled', async () => {
      const wrapper = await mountSuspended(UploadDocumentDropzone, {
        props: { disabled: true },
      });
      wrapper
        .find('.upload-zone')
        .element.dispatchEvent(dragEvent('drop', [makeFile()]));

      expect(wrapper.emitted('filesSelected')).toBeFalsy();
    });
  });
});
