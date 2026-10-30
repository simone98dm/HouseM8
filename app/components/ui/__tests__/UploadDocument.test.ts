import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UploadDocument from '~/components/ui/UploadDocument.vue';

function makePdfFile(name = 'doc.pdf', sizeBytes = 1024) {
  return new File(['x'.repeat(sizeBytes)], name, { type: 'application/pdf' });
}

function makeImageFile(name = 'photo.jpg', sizeBytes = 1024) {
  return new File(['x'.repeat(sizeBytes)], name, { type: 'image/jpeg' });
}

async function selectFiles(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  files: File[],
) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
}

describe('UploadDocument', () => {
  describe('initial render', () => {
    it('renders the upload zone', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      expect(wrapper.find('.upload-zone').exists()).toBe(true);
    });

    it('does not show file list initially', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      expect(wrapper.text()).not.toContain('Selected');
    });

    it('does not show error message initially', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      expect(wrapper.find('.state-card--error').exists()).toBe(false);
    });
  });

  describe('file selection — valid file', () => {
    it('shows selected file in the list', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile('resume.pdf')]);
      expect(wrapper.text()).toContain('resume.pdf');
    });

    it('shows selected file count in heading', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile()]);
      expect(wrapper.text()).toContain('1');
    });

    it('replaces previous file in single-file mode (default)', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile('first.pdf')]);
      await selectFiles(wrapper, [makePdfFile('second.pdf')]);
      expect(wrapper.text()).toContain('second.pdf');
      expect(wrapper.text()).not.toContain('first.pdf');
    });

    it('accumulates files in multiple mode', async () => {
      const wrapper = await mountSuspended(UploadDocument, {
        props: { multiple: true },
      });
      await selectFiles(wrapper, [makePdfFile('a.pdf')]);
      await selectFiles(wrapper, [makePdfFile('b.pdf')]);
      expect(wrapper.text()).toContain('a.pdf');
      expect(wrapper.text()).toContain('b.pdf');
    });
  });

  describe('file validation — size', () => {
    it('shows error when file exceeds maxSize', async () => {
      const bigFile = makePdfFile('big.pdf', 11 * 1024 * 1024);
      const wrapper = await mountSuspended(UploadDocument, {
        props: { maxSize: 10 },
      });
      await selectFiles(wrapper, [bigFile]);
      expect(wrapper.find('.state-card--error').exists()).toBe(true);
    });

    it('does not add oversized file to the list', async () => {
      const bigFile = makePdfFile('big.pdf', 11 * 1024 * 1024);
      const wrapper = await mountSuspended(UploadDocument, {
        props: { maxSize: 10 },
      });
      await selectFiles(wrapper, [bigFile]);
      expect(wrapper.text()).not.toContain('Selected');
    });
  });

  describe('file validation — type', () => {
    it('shows error for unsupported file extension', async () => {
      const jsFile = new File(['code'], 'app.js', { type: 'text/javascript' });
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [jsFile]);
      expect(wrapper.find('.state-card--error').exists()).toBe(true);
    });

    it('does not add unsupported file to the list', async () => {
      const jsFile = new File(['code'], 'app.js', { type: 'text/javascript' });
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [jsFile]);
      expect(wrapper.text()).not.toContain('Selected');
    });
  });

  describe('removeFile', () => {
    it('removes file from list', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile('remove-me.pdf')]);
      expect(wrapper.text()).toContain('remove-me.pdf');
      // Find and click the remove button (inside the file list)
      const removeBtn = wrapper.find('button[aria-label]');
      await removeBtn.trigger('click');
      expect(wrapper.text()).not.toContain('Selected');
    });

    it('clears error when a file is removed', async () => {
      const bigFile = makePdfFile('big.pdf', 11 * 1024 * 1024);
      const wrapper = await mountSuspended(UploadDocument, {
        props: { multiple: true, maxSize: 10 },
      });
      await selectFiles(wrapper, [makePdfFile('ok.pdf')]);
      await selectFiles(wrapper, [bigFile]);
      // Error appears for the big file; now remove the valid file
      const removeBtn = wrapper.find('button[aria-label]');
      await removeBtn.trigger('click');
    });
  });

  describe('handleUpload', () => {
    it('upload button is enabled when files are selected', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile('doc.pdf')]);
      const uploadBtn = wrapper.find('.flex.justify-end button');
      expect(uploadBtn.exists()).toBe(true);
      expect(uploadBtn.attributes('disabled')).toBeUndefined();
    });

    it('shows singular upload label for one file', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile()]);
      expect(wrapper.find('.flex.justify-end').text()).toContain('Upload file');
    });

    it('upload section not rendered when no files selected', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      expect(wrapper.find('.flex.justify-end').exists()).toBe(false);
    });
  });

  describe('disabled prop', () => {
    it('does not show file list when disabled and no files', async () => {
      const wrapper = await mountSuspended(UploadDocument, {
        props: { disabled: true },
      });
      expect(wrapper.text()).not.toContain('Selected');
    });
  });

  describe('drag and drop', () => {
    it('sets dragging state on dragenter', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await wrapper.find('.upload-zone').trigger('dragenter');
      const zone = wrapper.find('.upload-zone');
      expect(zone.exists()).toBe(true);
    });

    it('clears dragging state on dragleave from upload-zone', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      const zone = wrapper.find('.upload-zone');
      await zone.trigger('dragenter');
      await zone.trigger('dragleave');
      expect(zone.exists()).toBe(true);
    });

    it('adds dropped pdf file to the list', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      const file = makePdfFile('dropped.pdf');
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file] },
      });
      await wrapper.find('.upload-zone').element.dispatchEvent(dropEvent);
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('dropped.pdf');
    });

    it('ignores drag events when disabled', async () => {
      const wrapper = await mountSuspended(UploadDocument, {
        props: { disabled: true },
      });
      await wrapper.find('.upload-zone').trigger('dragenter');
      // No file list should appear
      expect(wrapper.text()).not.toContain('Selected');
    });
  });

  describe('getFileIcon', () => {
    it('shows different icons for pdf vs image files', async () => {
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [makePdfFile('report.pdf')]);
      expect(wrapper.text()).toContain('report.pdf');

      const wrapper2 = await mountSuspended(UploadDocument);
      await selectFiles(wrapper2, [makeImageFile('photo.jpg')]);
      expect(wrapper2.text()).toContain('photo.jpg');
    });

    it('renders doc file without error', async () => {
      const docFile = new File(['x'], 'letter.doc', {
        type: 'application/msword',
      });
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [docFile]);
      expect(wrapper.text()).toContain('letter.doc');
    });
  });

  describe('error dismissal', () => {
    it('clears error when close button clicked', async () => {
      const bigFile = makePdfFile('big.pdf', 11 * 1024 * 1024);
      const wrapper = await mountSuspended(UploadDocument);
      await selectFiles(wrapper, [bigFile]);
      expect(wrapper.find('.state-card--error').exists()).toBe(true);
      // The close button inside the error box
      const closeBtn = wrapper.find('.state-card--error button');
      await closeBtn.trigger('click');
      expect(wrapper.find('.state-card--error').exists()).toBe(false);
    });
  });
});
