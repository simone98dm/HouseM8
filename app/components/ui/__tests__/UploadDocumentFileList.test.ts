/**
 * UploadDocumentFileList Component Tests
 * Covers the selected-files list + upload button extracted from
 * UploadDocument.vue. UploadDocument.test.ts still covers the end-to-end
 * flow; this file exercises the list's own contract in isolation: it's a
 * dumb presentational list driven entirely by the `files` prop.
 */

import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UploadDocumentFileList from '~/components/ui/UploadDocumentFileList.vue';

function makeFile(name = 'doc.pdf', sizeBytes = 1024) {
  return new File(['x'.repeat(sizeBytes)], name, { type: 'application/pdf' });
}

describe('UploadDocumentFileList', () => {
  it('renders one row per file with its name and formatted size', async () => {
    const wrapper = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('resume.pdf', 2048)] },
    });

    expect(wrapper.text()).toContain('resume.pdf');
    expect(wrapper.text()).toContain('2 kB');
  });

  it('shows the file count in the heading', async () => {
    const wrapper = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf'), makeFile('b.pdf')] },
    });

    expect(wrapper.text()).toContain('2');
  });

  it('emits remove with the row index', async () => {
    const wrapper = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf'), makeFile('b.pdf')] },
    });

    const removeButtons = wrapper.findAll('button[aria-label^="Remove"]');
    await removeButtons[1]?.trigger('click');

    expect(wrapper.emitted('remove')?.[0]).toEqual([1]);
  });

  // Regression guard for a bug that shipped in the original UploadDocument.vue:
  // `@click.stop="handleUpload"` on a UiButton. UiButton emits `click` with zero
  // payload (`$emit('click')` in Button.vue), and Vue compiles `.stop` to
  // withModifiers, which calls `event.stopPropagation()` on that undefined
  // payload — so the handler never ran and document upload silently did nothing.
  // `.stop` is meaningless on a component's custom event (custom events do not
  // propagate), so the fix is to drop the modifier. Keep this test: it fails the
  // moment anyone reintroduces a modifier on a payload-less component emit.
  it('emits upload when the upload button is clicked', async () => {
    const wrapper = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf')] },
    });

    await wrapper.find('.flex.justify-end button').trigger('click');

    expect(wrapper.emitted('upload')).toBeTruthy();
  });

  it('disables the upload button when disabled prop is true', async () => {
    const wrapper = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf')], disabled: true },
    });

    expect(
      wrapper.find('.flex.justify-end button').attributes('disabled'),
    ).toBeDefined();
  });

  it('shows singular label for one file and plural for many', async () => {
    const single = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf')] },
    });
    expect(single.find('.flex.justify-end').text()).toContain('Upload file');

    const multi = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf'), makeFile('b.pdf')] },
    });
    expect(multi.find('.flex.justify-end').text()).toContain('Upload files');
  });

  it('labels each remove button with the file name', async () => {
    const wrapper = await mountSuspended(UploadDocumentFileList, {
      props: { files: [makeFile('a.pdf')] },
    });

    expect(wrapper.find('button[aria-label="Remove a.pdf"]').exists()).toBe(
      true,
    );
  });

  it('does not submit an enclosing form when removing a file', async () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    const wrapper = await mountSuspended(
      {
        components: { UploadDocumentFileList },
        props: ['files'],
        template:
          '<form @submit="onSubmit"><UploadDocumentFileList :files="files" /></form>',
        setup: () => ({ onSubmit }),
      },
      { props: { files: [makeFile('a.pdf')] }, attachTo: document.body },
    );

    const btn = wrapper.find('button[aria-label="Remove a.pdf"]');
    expect(btn.attributes('type')).toBe('button');
    await btn.trigger('click');
    expect(onSubmit).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
