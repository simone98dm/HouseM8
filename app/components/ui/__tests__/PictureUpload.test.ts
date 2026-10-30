import { describe, it, expect, beforeAll } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import PictureUpload from '~/components/ui/PictureUpload.vue';

beforeAll(() => {
  global.URL.createObjectURL = () => 'blob:mock';
});

const mount = (props: Record<string, unknown> = {}) =>
  mountSuspended(PictureUpload, { props: { modelValue: null, ...props } });

const pick = async (w: Awaited<ReturnType<typeof mount>>, file: File) => {
  const input = w.get('input[type="file"]');
  Object.defineProperty(input.element, 'files', { value: [file] });
  await input.trigger('change');
};

describe('UiPictureUpload', () => {
  it('labels the file input with the drop zone label', async () => {
    const w = await mount({ label: 'Add photo' });
    expect(w.get('input[type="file"]').attributes('aria-label')).toBe(
      'Add photo',
    );
    expect(w.text()).toContain('Add photo');
  });

  it('falls back to the translated default label', async () => {
    const w = await mount();
    expect(w.get('input[type="file"]').attributes('aria-label')).toBe(
      'Click to upload or drag and drop',
    );
  });

  it('formats the size limit with a localized unit, not a hard-coded MB', async () => {
    const w = await mount({ maxSize: 5 });
    const expected = new Intl.NumberFormat('en', {
      style: 'unit',
      unit: 'megabyte',
    }).format(5);
    expect(w.text()).toContain(`PNG, JPG, GIF up to ${expected}`);
  });

  it('announces a rejected file and does not set the model', async () => {
    const w = await mount();
    await pick(w, new File(['abc'], 'doc.pdf', { type: 'application/pdf' }));
    const alert = w.get('[role="alert"]');
    expect(alert.text()).toContain('application/pdf');
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('rejects an oversized file with the formatted limit', async () => {
    const w = await mount({ maxSize: 1 });
    await pick(
      w,
      new File(['x'.repeat(2 * 1024 * 1024)], 'big.jpg', {
        type: 'image/jpeg',
      }),
    );
    expect(w.get('[role="alert"]').text()).toContain('big.jpg');
  });

  it('accepts a valid file', async () => {
    const w = await mount();
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    await pick(w, file);
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([file]);
    expect(w.find('[role="alert"]').exists()).toBe(false);
  });

  it('shows a labelled remove button for a selected file and clears it', async () => {
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' });
    const w = await mount({ modelValue: file });
    const remove = w.get('button[aria-label="Remove a.jpg"]');
    await remove.trigger('click');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([null]);
  });
});
